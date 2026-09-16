
(function() {
  console.log('[dummy-widgets] Módulo muestrario de tamaños de widgets cargado.');

  window.__CLEANUP_dummy_widgets__ = function() {
    console.log('[dummy-widgets] Limpieza de módulo ejecutada.');
    delete window.__CLEANUP_dummy_widgets__;
  };
})();
