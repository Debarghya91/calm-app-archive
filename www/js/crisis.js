// Crisis resources are always available and never depend on an AI key or subscription.
const CRISIS=/(kill myself|suicid|end my life|want to die|don'?t want to live|self[- ]?harm|hurt myself|cut myself|better off dead|no reason to live|overdose|end it all|take my own life|khudkushi|khud ko maar|marna chahta|marna chahti|jeena nahi chahta|jeena nahi chahti|মরে যেতে চাই|বাঁচতে চাই না|আত্মহত্যা|নিজেকে শেষ)/i;
const CRISIS_INDIRECT=/(can'?t go on|no way out|everyone.{0,12}better without me|give up on (life|everything)|disappear forever|khud ko nuksan|ab aur nahi|jeene ka mann nahi|আর পারছি না|আর বাঁচতে চাই না|নিজের ক্ষতি)/i;
function hasCrisisSignal(text){
 const cleaned=String(text||'').replace(/\b(?:i am not suicidal|i'm not suicidal|i do not want to die|i don't want to die|i have no intention of (?:hurting|harming) myself|i am not going to (?:hurt|harm) myself)\b/gi,'').replace(/(?:khudkushi nahi karna chahta|khudkushi nahi karna chahti|khudkushi nahi karni|marna nahi chahta|marna nahi chahti|মরে যেতে চাই না|আমি মরতে চাই না|আত্মহত্যা করতে চাই না)/gi,'');
 return CRISIS.test(cleaned)||CRISIS_INDIRECT.test(cleaned);
}
function crisis(){
 const d=$('#dlg');
 const copy={
  en:{title:'You matter. Please reach a person now.',intro:'If you may act on thoughts of harming yourself, or you are in immediate danger, contact emergency support now. These India services are free to call.',help:'If possible, move near someone you trust and tell them directly that you need support. Move away from anything you could use to hurt yourself. Outside India, contact your local emergency number or crisis service. SoulSpace is not an emergency service.'},
  hi:{title:'आप महत्वपूर्ण हैं। कृपया अभी किसी व्यक्ति से संपर्क करें।',intro:'यदि आपको खुद को नुकसान पहुँचाने का डर है या आप तत्काल खतरे में हैं, तो अभी आपातकालीन सहायता लें। भारत में ये सेवाएँ उपलब्ध हैं।',help:'यदि संभव हो, किसी भरोसेमंद व्यक्ति के पास जाएँ और उन्हें साफ़ बताएँ कि आपको सहायता चाहिए। खुद को नुकसान पहुँचाने वाली चीज़ों से दूर रहें। भारत के बाहर स्थानीय आपातकालीन सेवा से संपर्क करें। SoulSpace आपातकालीन सेवा नहीं है।'},
  bn:{title:'আপনি গুরুত্বপূর্ণ। অনুগ্রহ করে এখনই কারও সঙ্গে যোগাযোগ করুন।',intro:'নিজের ক্ষতি করার আশঙ্কা থাকলে বা আপনি তাৎক্ষণিক বিপদে থাকলে এখনই জরুরি সহায়তা নিন। ভারতে এই নম্বরগুলিতে বিনামূল্যে ফোন করা যায়।',help:'সম্ভব হলে বিশ্বাসযোগ্য কারও কাছে যান এবং স্পষ্ট করে বলুন যে আপনার সাহায্য দরকার। নিজের ক্ষতি করতে পারেন এমন জিনিস থেকে দূরে থাকুন। ভারতের বাইরে স্থানীয় জরুরি পরিষেবায় যোগাযোগ করুন। SoulSpace জরুরি পরিষেবা নয়।'},
  hinglish:{title:'Aap important hain. Please abhi kisi insaan se baat karein.',intro:'Agar aapko khud ko nuksan pahunchane ka darr hai ya aap immediate danger mein hain, abhi emergency support se contact karein.',help:'Mumkin ho toh kisi trusted person ke paas jaiye aur seedha batayein ki aapko support chahiye. Khud ko nuksan pahunchane wali cheezon se door ho jaiye. India ke bahar local emergency service se contact karein. SoulSpace emergency service nahi hai.'}
 };
 const t=copy[S.language]||copy.en;
 d.innerHTML=`<h2>${t.title}</h2><p>${t.intro}</p><a class="tel" href="tel:112">Emergency services · 112</a><a class="tel" href="tel:14416" style="background:#687b91">Tele-MANAS mental health support · 14416</a><p class="mute">${t.help}</p><button class="alt" onclick="$('#dlg').close()">Close</button>`;
 d.showModal();
}
