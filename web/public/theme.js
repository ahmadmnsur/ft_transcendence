(function () {
  var theme = null;
  try {
    theme = window.localStorage.getItem('peerconnect.theme');
  } catch (error) {
    theme = null;
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();
