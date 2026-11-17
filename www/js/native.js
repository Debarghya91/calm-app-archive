// Native (Capacitor) behaviour for the Android app. Safe no-op on the web:
// every Capacitor call is guarded, and the lifecycle handlers only touch
// state this app already owns (the sleep-sound AudioContext, the AI status).
(function(){
  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var plugins = (cap && cap.Plugins) || {};
  var App = plugins.App, StatusBar = plugins.StatusBar, SplashScreen = plugins.SplashScreen, Browser = plugins.Browser;
  // StatusBar.setBackgroundColor is Android-only: on iOS the native bridge
  // rejects it with UNIMPLEMENTED ("not implemented") on every call.
  var isAndroid = !!(cap && cap.getPlatform && cap.getPlatform() === 'android');

  function isDark(){
    var t = document.documentElement.dataset.theme;
    if(t === 'dark') return true;
    if(t === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyStatusBar(){
    if(!native || !StatusBar) return;
    try{
      StatusBar.setStyle({style: isDark() ? 'DARK' : 'LIGHT'}).catch(function(){});
      if(isAndroid) StatusBar.setBackgroundColor({color: isDark() ? '#171b19' : '#f5f3ef'}).catch(function(){});
    }catch(e){}
  }
  applyStatusBar();
  try{
    new MutationObserver(applyStatusBar).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyStatusBar);
  }catch(e){}

  // Hide the launch splash once the app shell has rendered.
  function hideSplash(){ if(native && SplashScreen){ try{ SplashScreen.hide().catch(function(){}); }catch(e){} } }
  window.addEventListener('load', function(){ setTimeout(hideSplash, 250); });
  setTimeout(hideSplash, 2500);

  // Android back button: close any open dialog first, step back to Home
  // from other tabs, and only exit from Home. Legal pages (privacy.html
  // etc.) do not load this script, so the WebView default back behaviour
  // (history back, then exit) still applies there.
  if(native && App && App.addListener){
    try{
      App.addListener('backButton', function(){
        try{
          var dlg = document.querySelector('dialog[open]');
          if(dlg){
            if(typeof discoveryState !== 'undefined' && discoveryState) { discoveryClose(); }
            else dlg.close();
            return;
          }
          if(typeof tab !== 'undefined' && tab === 'admin'){ go('me'); return; }
          if(typeof tab !== 'undefined' && tab !== 'home'){ go('home'); return; }
          App.exitApp();
        }catch(e){}
      });
    }catch(e){}
  }

  // Sleep sounds: WebView audio cannot keep playing once the activity is
  // paused without a native foreground service (not in this build), so
  // suspend the AudioContext on background and resume it on return when
  // a sound was playing. The sleep timer is wall-clock based and keeps
  // its deadline; its countdown label refreshes on resume.
  var soundWasPlaying = false;
  function onBackground(){
    try{
      soundWasPlaying = !!(typeof snd !== 'undefined' && snd);
      if(typeof ac !== 'undefined' && ac && ac.suspend) ac.suspend();
    }catch(e){}
  }
  function onForeground(){
    try{
      if(soundWasPlaying && typeof ac !== 'undefined' && ac && ac.resume) ac.resume();
      if(typeof checkService === 'function') checkService();
      applyStatusBar();
    }catch(e){}
  }
  if(native && App && App.addListener){
    try{ App.addListener('appStateChange', function(s){ s && s.isActive ? onForeground() : onBackground(); }); }catch(e){}
  }
  document.addEventListener('visibilitychange', function(){ document.hidden ? onBackground() : onForeground(); });
  window.addEventListener('online', function(){ if(typeof checkService === 'function') checkService(); });

  // External links open in the system browser, never inside the app WebView.
  // tel: links and same-app pages (privacy/terms/support) are untouched.
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(!/^https?:\/\//i.test(href)) return;
    if(native && Browser && Browser.open){
      ev.preventDefault();
      try{ Browser.open({url: href}).catch(function(){ window.open(href, '_blank'); }); }catch(e){ window.open(href, '_blank'); }
    }
  }, true);

  // Keep a focused input visible above the Android keyboard (the manifest
  // uses adjustResize; this scrolls the field into view after the resize).
  document.addEventListener('focusin', function(ev){
    if(!native) return;
    var el = ev.target;
    if(el && el.scrollIntoView) setTimeout(function(){ try{ el.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e){} }, 350);
  });
})();
