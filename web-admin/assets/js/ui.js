function mostrarCargandoTabla(tbodyId, colspan, mensaje = 'Cargando...') {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" class="text-center py-5">
          <div class="spinner-border text-primary mb-2" role="status" style="width:2rem;height:2rem">
            <span class="visually-hidden">Cargando</span>
          </div>
          <div class="text-muted small">${mensaje}</div>
        </td>
      </tr>
    `;
  }
  
  function mostrarCargandoContenedor(elementId, mensaje = 'Cargando...') {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `
      <div class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
        <span class="text-muted">${mensaje}</span>
      </div>
    `;
  }
  
  function mostrarErrorTabla(tbodyId, colspan, mensaje, reintentarFn) {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" class="text-center py-5">
          <div class="text-danger mb-2">
            <i class="bi bi-exclamation-triangle-fill fs-3 d-block mb-2"></i>
            <strong>Error al cargar</strong>
            <div class="small text-muted mt-1">${mensaje}</div>
          </div>
          <button class="btn btn-outline-primary btn-sm mt-2" onclick="(${reintentarFn.name})()">
            <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
          </button>
        </td>
      </tr>
    `;
  }
  
  function mostrarVacioTabla(tbodyId, colspan, mensaje = 'No hay registros para mostrar') {
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-3 d-block mb-2"></i>
          ${mensaje}
        </td>
      </tr>
    `;
  }
  
  function mostrarToast(mensaje, tipo = 'danger') {
    const existente = document.getElementById('toast-error');
    if (existente) existente.remove();
    const toast = document.createElement('div');
    toast.id = 'toast-error';
    toast.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3 shadow`;
    toast.style.zIndex = '9999';
    toast.style.minWidth = '300px';
    toast.innerHTML = `
      <div class="d-flex align-items-center">
        <i class="bi bi-exclamation-circle me-2"></i>
        <div class="flex-grow-1">${mensaje}</div>
        <button type="button" class="btn-close ms-2" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }
  
  function bloquearBoton(boton, textoCargando = 'Cargando...') {
    if (!boton) return () => {};
    const textoOriginal = boton.innerHTML;
    const estabaDeshabilitado = boton.disabled;
    boton.disabled = true;
    boton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${textoCargando}`;
    return () => {
      boton.disabled = estabaDeshabilitado;
      boton.innerHTML = textoOriginal;
    };
  }

  function renderPaginacion(containerId, pagination, onPageChange) {
    const { page, totalPages, total } = pagination;
    const contenedor = document.getElementById(containerId);
    if (!contenedor) return;
  
    if (total === 0) {
      contenedor.innerHTML = '';
      return;
    }
  
    const maxBotones = 5;
    let inicio = Math.max(1, page - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPages, inicio + maxBotones - 1);
    if (fin - inicio < maxBotones - 1) {
      inicio = Math.max(1, fin - maxBotones + 1);
    }
  
    const botones = [];
    botones.push(`<li class="page-item ${page === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange.name}(${page - 1})">
        <i class="bi bi-chevron-left"></i>
      </a>
    </li>`);
  
    if (inicio > 1) {
      botones.push(`<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange.name}(1)">1</a></li>`);
      if (inicio > 2) botones.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
    }
  
    for (let i = inicio; i <= fin; i++) {
      botones.push(`<li class="page-item ${i === page ? 'active' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange.name}(${i})">${i}</a>
      </li>`);
    }
  
    if (fin < totalPages) {
      if (fin < totalPages - 1) botones.push(`<li class="page-item disabled"><span class="page-link">…</span></li>`);
      botones.push(`<li class="page-item"><a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange.name}(${totalPages})">${totalPages}</a></li>`);
    }
  
    botones.push(`<li class="page-item ${page === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); ${onPageChange.name}(${page + 1})">
        <i class="bi bi-chevron-right"></i>
      </a>
    </li>`);
  
    const desde = (page - 1) * pagination.limit + 1;
    const hasta = Math.min(page * pagination.limit, total);
  
    contenedor.innerHTML = `
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
        <small class="text-muted">Mostrando ${desde}–${hasta} de ${total}</small>
        <nav><ul class="pagination pagination-sm mb-0">${botones.join('')}</ul></nav>
      </div>
    `;
  }
  
  function debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }