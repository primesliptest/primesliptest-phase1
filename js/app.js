const navbar=document.getElementById('navbar');
window.addEventListener('scroll',()=>navbar.classList.toggle('scrolled',scrollY>20),{passive:true});

const menu=document.getElementById('navToggle'),mobile=document.getElementById('mobileNav');
if(menu) menu.addEventListener('click',()=>mobile.classList.toggle('open'));

document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>mobile.classList.remove('open')));

const ack=document.getElementById('ack-close');
if(ack) ack.addEventListener('click',()=>document.getElementById('ack').remove());

const obs=new IntersectionObserver(
  entries=>entries.forEach((e,i)=>{
    if(e.isIntersecting){
      setTimeout(
        ()=>e.target.classList.add('on'),
        Number(e.target.dataset.d)||0
      );
      obs.unobserve(e.target);
    }
  }),
  {
    threshold:.04,
    rootMargin:'0px 0px -40px 0px'
  }
);

document.querySelectorAll('.reveal').forEach((el,i)=>{
  el.dataset.d=(i%5)*65;
  obs.observe(el);
});


// Conversational quote wizard
const form=document.getElementById('quoteForm');
const steps=[...document.querySelectorAll('.form-step')];
let currentStep=1;

const stepTitles={
  1:'Tell us who you are',
  2:'Tell us what you need',
  3:'Add the final details'
};

function showStep(n){
  currentStep=n;

  steps.forEach(s=>
    s.classList.toggle(
      'is-active',
      Number(s.dataset.step)===n
    )
  );

  const pct=(n/3)*100;

  const bar=document.getElementById('progressBar');
  if(bar) bar.style.width=pct+'%';

  const label=document.getElementById('stepLabel');
  if(label) label.textContent=`STEP 0${n} / 03`;

  const title=document.getElementById('stepTitle');
  if(title) title.textContent=stepTitles[n];
}

function requiredForStep(n){
  const ids=
    n===1
      ? ['fname','lname','email','phone']
      : n===2
        ? ['service','site']
        : [];

  let valid=true;

  ids.forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;

    const bad=
      !el.value.trim() ||
      (
        el.type==='email' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)
      );

    el.classList.toggle('err',bad);

    if(bad) valid=false;
  });

  return valid;
}

document.querySelectorAll('.conversation-next').forEach(btn=>
  btn.addEventListener('click',()=>{
    const next=Number(btn.dataset.next);

    if(requiredForStep(currentStep)){
      showStep(next);
    }
  })
);

document.querySelectorAll('.conversation-back').forEach(btn=>
  btn.addEventListener('click',()=>{
    showStep(Number(btn.dataset.back));
  })
);

document.querySelectorAll('.fg input,.fg select,.fg textarea')
  .forEach(el=>
    el.addEventListener('input',()=>{
      el.classList.remove('err');
    })
  );


if(form){

  form.addEventListener('submit',async e=>{

    e.preventDefault();

    // Validate the first two conversational steps before submitting.
    if(!requiredForStep(1)){
      showStep(1);
      return;
    }

    if(!requiredForStep(2)){
      showStep(2);
      return;
    }

    const btn=document.getElementById('submitBtn');
    const success=document.getElementById('formSuccess');
    const originalLabel='Send Quote Request <span>→</span>';
    const tableName='quote_requests';
    const bucketName='quote-attachments';

    if(!window.supabase || !supabaseClient){
      console.error('Supabase client is not available.');

      alert(
        'The quote service is temporarily unavailable. Please call us on 0450 135 119 or email admin@primesliptest.com.au'
      );

      return;
    }

    btn.disabled=true;
    btn.innerHTML='Sending…';

    if(success) success.classList.remove('show');

    try{

      // Honeypot spam protection.
      // This field is hidden from normal users.
      const honeypot=form.querySelector('[name="_gotcha"]');

      if(honeypot && honeypot.value.trim()){
        throw new Error('Spam submission blocked.');
      }

      const getValue=id=>{
        const el=document.getElementById(id);
        return el ? el.value.trim() : '';
      };

      const files=photo
        ? Array.from(photo.files).slice(0,5)
        : [];

      const uploadedFiles=[];


      // Upload optional site photos first.
      // The database record stores only their paths.
      for(const file of files){

        if(file.size > 10 * 1024 * 1024){
          throw new Error(
            `File ${file.name} exceeds the 10MB limit.`
          );
        }

        if(
          ![
            'image/jpeg',
            'image/png',
            'application/pdf'
          ].includes(file.type)
        ){
          throw new Error(
            `File ${file.name} is not a supported JPG, PNG or PDF file.`
          );
        }

        const safeName=file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '-'
        );

        const path=`${crypto.randomUUID()}-${safeName}`;

        const {error:uploadError}=
          await supabaseClient.storage
            .from(bucketName)
            .upload(
              path,
              file,
              {
                upsert:false,
                contentType:file.type
              }
            );

        if(uploadError) throw uploadError;

        uploadedFiles.push({
          name:file.name,
          path,
          type:file.type,
          size:file.size
        });
      }


      // Keep the database payload explicit instead of
      // sending the raw FormData object.
      const quote={
        first_name:getValue('fname'),
        last_name:getValue('lname'),
        company:getValue('company'),
        email:getValue('email'),
        phone:getValue('phone'),
        service:getValue('service'),
        site_address:getValue('site'),
        industry:getValue('industry'),
        timing:getValue('timing'),
        message:getValue('message'),
        attachment_paths:uploadedFiles,
        source:'website_quote_form'
      };


      // ---------------------------------------------------------
      // 1. STORE QUOTE REQUEST IN SUPABASE
      // ---------------------------------------------------------
      //
      // IMPORTANT:
      // Do NOT add .select() or .single() here.
      //
      // This is the same working database operation from
      // your previous app.js.
      //
      const {error:insertError}=await supabaseClient
        .from(tableName)
        .insert([quote]);

      if(insertError) throw insertError;

      console.log('Quote saved successfully.');


      // ---------------------------------------------------------
      // 2. SEND EMAIL NOTIFICATION THROUGH SUPABASE EDGE FUNCTION
      // ---------------------------------------------------------
      //
      // The Edge Function:
      //
      // send-quote-notification
      //
      // receives the quote data and uses the RESEND_API_KEY
      // stored securely in Supabase Edge Function Secrets.
      //
      // The Resend API key is NEVER exposed to the browser.
      //
      const {
        data:notificationData,
        error:notificationError
      } = await supabaseClient.functions.invoke(
        'send-quote-notification',
        {
          body:quote
        }
      );


      // IMPORTANT:
      // The quote has already been stored successfully.
      //
      // Therefore an email notification failure should NOT
      // make the customer think their quote was lost.
      //
      // We log the notification error but keep the existing
      // successful quote-submission behavior.
      if(notificationError){

        console.error(
          'Quote notification email failed:',
          notificationError
        );

      }else{

        console.log(
          'Quote notification email sent successfully:',
          notificationData
        );

      }


      // ---------------------------------------------------------
      // 3. EXISTING SUCCESS BEHAVIOUR
      // ---------------------------------------------------------

      form.reset();

      showFiles([]);

      showStep(1);

      if(success) success.classList.add('show');

      btn.innerHTML='✓ Quote Submitted';

      btn.style.background='var(--green,#00a651)';


      // Return the button to its normal state after
      // the success message is visible.
      setTimeout(()=>{

        btn.disabled=false;

        btn.innerHTML=originalLabel;

        btn.style.background='';

      },4000);


    }catch(err){

      console.error(
        'Quote submission failed:',
        err
      );

      btn.disabled=false;

      btn.innerHTML=originalLabel;

      btn.style.background='';

      alert(
        'We could not submit your quote request. Please try again, or call us on 0450 135 119 or email admin@primesliptest.com.au'
      );

    }

  });

}


function showFiles(files){

  const list=document.getElementById('file-list');
  const title=document.getElementById('upload-title');
  const area=document.getElementById('upload-area');

  if(!list || !title || !area) return;

  list.innerHTML='';

  if(!files.length) return;

  area.style.borderColor='var(--orange)';
  area.style.background='#fff8f2';

  title.textContent=
    files.length +
    ' file' +
    (files.length>1 ? 's' : '') +
    ' selected';

  Array.from(files)
    .slice(0,5)
    .forEach(file=>{

      const tag=document.createElement('div');

      tag.className='file-tag';

      tag.textContent=
        '↗ ' +
        file.name.substring(0,28) +
        (file.name.length>28 ? '…' : '');

      list.appendChild(tag);

    });

  if(files.length>5){

    const w=document.createElement('p');

    w.style.cssText=
      'width:100%;font-size:9px;color:var(--orange)';

    w.textContent=
      'Only the first 5 photos will be uploaded.';

    list.appendChild(w);
  }
}


const photo=document.getElementById('photos');

if(photo){

  photo.addEventListener(
    'change',
    e=>showFiles(e.target.files)
  );

}


const upload=document.getElementById('upload-area');

if(upload){

  upload.addEventListener(
    'dragover',
    e=>e.preventDefault()
  );

  upload.addEventListener(
    'drop',
    e=>{
      e.preventDefault();

      if(photo){

        photo.files=e.dataTransfer.files;

        showFiles(e.dataTransfer.files);

      }
    }
  );

}


showStep(1);


// -------------------------------------------------------------
// SUPABASE CONFIGURATION
// -------------------------------------------------------------

const SUPABASE_URL =
  'https://yjcwxkjvpllbpevsteco.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_bL1Tc9kftvHmIfb3Vew4Gw_3r6Mprxx';

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );