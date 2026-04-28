// ── PWA INSTALL ──────────────────────────
var _deferredInstallPrompt=null;

window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();_deferredInstallPrompt=e;
  if(!localStorage.getItem('wnu_install_dismissed')){
    setTimeout(function(){document.getElementById('install-banner').style.display='block';},3000);
  }
});

document.getElementById('install-btn').onclick=function(){
  document.getElementById('install-banner').style.display='none';
  if(_deferredInstallPrompt){
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(function(result){
      if(result.outcome==='accepted')localStorage.setItem('wnu_install_dismissed','1');
      _deferredInstallPrompt=null;
    });
  }
};

document.getElementById('install-close').onclick=function(){
  document.getElementById('install-banner').style.display='none';
  localStorage.setItem('wnu_install_dismissed','1');
};

var isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
var isInStandaloneMode=window.navigator.standalone===true;
if(isIOS&&!isInStandaloneMode&&!localStorage.getItem('wnu_ios_dismissed')){
  setTimeout(function(){document.getElementById('ios-install-banner').style.display='block';},3000);
}

document.getElementById('ios-install-close').onclick=function(){
  document.getElementById('ios-install-banner').style.display='none';
  localStorage.setItem('wnu_ios_dismissed','1');
};

if(window.navigator.standalone||window.matchMedia('(display-mode: standalone)').matches){
  document.getElementById('install-banner').style.display='none';
  document.getElementById('ios-install-banner').style.display='none';
}

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(function(e){console.log('SW:',e);});
}
