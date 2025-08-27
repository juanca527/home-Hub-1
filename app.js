// -------------------
// Lógica compartida para el prototipo multi-página de HomeHub
// -------------------
const HH = (function(){

  // -------------------
  // Datos por defecto
  // -------------------
  const SERVICIOS_POR_DEFECTO = [
    { id: 's1', nombre: 'Aseo general (casa pequeña)', precio: 25000, tiempoAprox: '2 h' },
    { id: 's2', nombre: 'Aseo profundo', precio: 45000, tiempoAprox: '4 h' },
    { id: 's3', nombre: 'Limpieza de ventanas', precio: 20000, tiempoAprox: '1.5 h' },
    { id: 's4', nombre: 'Lavado de ropa y planchado', precio: 30000, tiempoAprox: '2.5 h' }
  ];

  const TRABAJADORAS_EJEMPLO = [
    { id: 'w1', nombre: 'María Pérez' },
    { id: 'w2', nombre: 'Laura Gómez' },
    { id: 'w3', nombre: 'Ana Rodríguez' }
  ];

  // -------------------
  // Funciones de acceso a "base de datos" (localStorage)
  // -------------------
  function dbObtener(clave, defecto){ 
    const valor = localStorage.getItem(clave); 
    return valor ? JSON.parse(valor) : defecto; 
  }

  function dbGuardar(clave, valor){ 
    localStorage.setItem(clave, JSON.stringify(valor)); 
  }

  // Inicialización de tablas si no existen
  if (!dbObtener('hh_servicios')) dbGuardar('hh_servicios', SERVICIOS_POR_DEFECTO);
  if (!dbObtener('hh_trabajadoras')) dbGuardar('hh_trabajadoras', TRABAJADORAS_EJEMPLO);
  if (!dbObtener('hh_usuarios')) dbGuardar('hh_usuarios', []);
  if (!dbObtener('hh_reservas')) dbGuardar('hh_reservas', []);

  // -------------------
  // Módulo de autenticación
  // -------------------
  const Autenticacion = {
    usuarioActual: function(){ return dbObtener('hh_usuarioActual', null); },

    iniciarSesion: function(correo, clave){
      const usuarios = dbObtener('hh_usuarios', []);
      return usuarios.find(u => u.correo === correo && u.clave === clave) || null;
    },

    registrar: function(nombre, correo, clave){
      const usuarios = dbObtener('hh_usuarios', []);
      if (usuarios.some(u => u.correo === correo)) 
        return { error: 'El correo ya está registrado' };
      const nuevo = { nombre, correo, clave, rol: 'cliente' };
      usuarios.push(nuevo); 
      dbGuardar('hh_usuarios', usuarios); 
      return { ok: true };
    },

    guardarSesion: function(usuario){ dbGuardar('hh_usuarioActual', usuario); },

    cerrarSesion: function(){ 
      localStorage.removeItem('hh_usuarioActual'); 
      window.location.href = 'index.html'; 
    },

    requerirSesion: function(){ 
      if (!this.usuarioActual()){ 
        window.location.href = 'index.html'; 
        return false; 
      } 
      return true; 
    }
  };

  // -------------------
  // Módulo de interfaz
  // -------------------
  const Interfaz = {
    mostrarServicios: function(contenedor){
      const servicios = dbObtener('hh_servicios', SERVICIOS_POR_DEFECTO);
      contenedor.innerHTML = '';
      servicios.forEach(s => {
        const tarjeta = document.createElement('div');
        tarjeta.className = 'p-6 rounded-xl shadow hover:shadow-lg bg-white';
        tarjeta.innerHTML = `
          <h3 class="text-lg font-semibold mb-1">${s.nombre}</h3>
          <div class="text-sm text-gray-600 mb-2">Tiempo aprox: ${s.tiempoAprox}</div>
          <div class="font-bold mb-3">COP ${s.precio.toLocaleString()}</div>
          <div class="flex gap-2">
            <button class="btn-solicitar px-3 py-2 rounded bg-gradient-to-r from-blue-500 to-green-400 text-white">Solicitar</button>
            <button class="btn-detalles px-3 py-2 rounded border">Detalles</button>
          </div>
        `;

        // Al presionar "Solicitar" se crea la reserva
        tarjeta.querySelector('.btn-solicitar').addEventListener('click', ()=>{
          const fecha = prompt('Fecha (AAAA-MM-DD)');
          const hora = prompt('Hora (HH:MM)');
          const direccion = prompt('Dirección completa');
          if (!fecha || !hora || !direccion) 
            return alert('Debes completar fecha, hora y dirección.');

          const reservas = dbObtener('hh_reservas', []);
          const trabajadoras = dbObtener('hh_trabajadoras', TRABAJADORAS_EJEMPLO);
          const asignada = trabajadoras[Math.floor(Math.random() * trabajadoras.length)];
          const actual = Autenticacion.usuarioActual();

          if (!actual){ 
            alert('Debes iniciar sesión'); 
            window.location.href = 'index.html'; 
            return; 
          }

          const nueva = { 
            id: 'r_'+Date.now(), 
            correoUsuario: actual.correo, 
            idServicio: s.id, 
            fecha, hora, direccion, 
            estado: 'CREADA', 
            trabajadora: asignada, 
            mensajes: [], 
            calificacion: null 
          };

          reservas.push(nueva); 
          dbGuardar('hh_reservas', reservas); 
          alert('Reserva creada. Personal asignado: ' + asignada.nombre);
        });

        contenedor.appendChild(tarjeta);
      });
    },

    mostrarReservas: function(contenedor){
      const reservas = dbObtener('hh_reservas', []);
      const actual = Autenticacion.usuarioActual();
      contenedor.innerHTML = '';

      if (!actual) { 
        contenedor.innerHTML = '<div class="text-sm text-gray-500">Inicia sesión para ver tus reservas.</div>'; 
        return; 
      }

      const mias = reservas.filter(r => r.correoUsuario === actual.correo);
      if (mias.length === 0){ 
        contenedor.innerHTML = '<div class="text-sm text-gray-500">No tienes reservas.</div>'; 
        return; 
      }

      mias.forEach(r =>{
        const servicio = dbObtener('hh_servicios').find(s => s.id === r.idServicio) || {nombre:'Servicio'};
        const el = document.createElement('div');
        el.className = 'p-4 bg-white rounded-lg shadow flex justify-between items-start';
        el.innerHTML = `
          <div>
            <div class="font-semibold">${servicio.nombre}</div>
            <div class="text-xs text-gray-600">${r.fecha} ${r.hora} • ${r.direccion}</div>
            <div class="text-xs text-gray-700 mt-1">Personal: ${r.trabajadora.nombre}</div>
            <div class="text-xs mt-1">Estado: <strong>${r.estado}</strong></div>
          </div>
          <div class="flex flex-col gap-2 items-end">
            <button class="chat-btn px-3 py-1 rounded border" data-id="${r.id}">Chat</button>
            ${r.estado === 'COMPLETADA' && !r.calificacion 
              ? `<button class="calificar-btn px-3 py-1 rounded bg-yellow-400" data-id="${r.id}">Calificar</button>` 
              : ''}
          </div>
        `;
        contenedor.appendChild(el);
      });

      // Vincular botones
      contenedor.querySelectorAll('.chat-btn').forEach(btn => 
        btn.addEventListener('click', (e)=>{ 
          const id = e.target.dataset.id; 
          window.abrirChat(id); 
        })
      );

      contenedor.querySelectorAll('.calificar-btn').forEach(btn => 
        btn.addEventListener('click', (e)=>{ 
          const id = e.target.dataset.id; 
          window.abrirCalificacion(id); 
        })
      );
    }
  };

  // -------------------
  // Controladores de chat y calificación
  // -------------------
  let chatReservaAbierta = null;

  return {
    Autenticacion, Interfaz,

    abrirChat: function(idReserva){
      const reservas = dbObtener('hh_reservas', []);
      const r = reservas.find(x => x.id === idReserva);
      if (!r) return alert('Reserva no encontrada');
      chatReservaAbierta = r.id;
      if (typeof window.mostrarChatModal === 'function') 
        window.mostrarChatModal(r);
    },

    enviarMensajeChat: function(texto){
      if (!chatReservaAbierta) return;
      const reservas = dbObtener('hh_reservas', []);
      const r = reservas.find(x => x.id === chatReservaAbierta);
      if (!r) return;
      const actual = Autenticacion.usuarioActual();
      const msg = { de: actual.nombre, texto, ts: Date.now() };
      r.mensajes.push(msg); 
      dbGuardar('hh_reservas', reservas);

      // Simular respuesta automática
      setTimeout(()=>{
        const resp = { de: r.trabajadora.nombre, texto: '¡Entendido! Nos vemos el día del servicio.', ts: Date.now() };
        r.mensajes.push(resp); 
        dbGuardar('hh_reservas', reservas);
        if (typeof window.chatActualizado === 'function') 
          window.chatActualizado(r.mensajes);
      }, 900);

      if (typeof window.chatActualizado === 'function') 
        window.chatActualizado(r.mensajes);
    },

    abrirCalificacion: function(idReserva){ 
      if (typeof window.mostrarCalificacionModal === 'function') 
        window.mostrarCalificacionModal(idReserva); 
    },

    enviarCalificacion: function(idReserva, puntaje, comentario){
      const reservas = dbObtener('hh_reservas', []);
      const r = reservas.find(x => x.id === idReserva); 
      if (!r) return;
      r.calificacion = { puntaje, comentario }; 
      dbGuardar('hh_reservas', reservas); 
      alert('Gracias por tu valoración'); 
      window.location.reload();
    },

    marcarCompletada: function(idReserva){ 
      const reservas = dbObtener('hh_reservas', []); 
      const r = reservas.find(x => x.id === idReserva); 
      if (!r) return; 
      r.estado = 'COMPLETADA'; 
      dbGuardar('hh_reservas', reservas); 
      alert('Reserva marcada como COMPLETADA'); 
    }
  };
})();

// Alias más simples para usar en las páginas
const HHAuth = HH.Autenticacion;
const HHUI = HH.Interfaz;

// -------------------
// index.html (login y registro)
// -------------------
if (location.pathname.endsWith('index.html') || location.pathname.endsWith('/')){
  document.addEventListener('DOMContentLoaded', ()=>{
    const form = document.getElementById('loginForm');
    const btnAlternar = document.getElementById('toggleMode');
    let modo = 'iniciar'; 
    const campoNombre = document.getElementById('nameField');
    const campoCorreo = document.getElementById('emailField');
    const campoClave = document.getElementById('passwordField');
    const notaModo = document.getElementById('modeNote');

    if (HHAuth.usuarioActual()){ 
      window.location.href='servicios.html'; 
      return; 
    }

    btnAlternar.addEventListener('click', ()=>{
      modo = modo === 'iniciar' ? 'registrar' : 'iniciar';
      btnAlternar.textContent = modo === 'iniciar' ? 'Registrar' : 'Iniciar';
      notaModo.innerHTML = modo === 'iniciar' 
        ? '¿No tienes cuenta? Pulsa <strong>Registrar</strong>.' 
        : 'Completa tu nombre para registrarte.';
      campoNombre.style.display = modo === 'iniciar' ? 'none' : 'block';
    });

    campoNombre.style.display = 'none';

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const correo = campoCorreo.value.trim();
      const clave = campoClave.value.trim();
      if (!correo || !clave) return alert('Completa correo y contraseña');

      if (modo === 'registrar'){
        const nombre = campoNombre.value.trim(); 
        if (!nombre) return alert('Ingresa tu nombre');
        const r = HHAuth.registrar(nombre, correo, clave);
        if (r && r.error) return alert(r.error);
        alert('Registro exitoso. Ahora inicia sesión.');
        modo = 'iniciar'; 
        btnAlternar.textContent = 'Registrar'; 
        campoNombre.style.display = 'none';
        campoNombre.value = '';
      } else {
        const usuario = HHAuth.iniciarSesion(correo, clave);
        if (!usuario) return alert('Credenciales inválidas');
        HHAuth.guardarSesion({ nombre: usuario.nombre, correo: usuario.correo });
        window.location.href = 'servicios.html';
      }
    });
  });
}

// -------------------
// servicios.html
// -------------------
if (location.pathname.endsWith('servicios.html')){
  window.addEventListener('DOMContentLoaded', ()=>{
    if (!HHAuth.requerirSesion()) return;
    document.getElementById('userNameHeader').textContent = 'Hola, ' + HHAuth.usuarioActual().nombre;
    document.getElementById('logoutBtn').addEventListener('click', ()=> HHAuth.cerrarSesion());
  });
}

// -------------------
// reservas.html
// -------------------
if (location.pathname.endsWith('reservas.html')){
  window.addEventListener('DOMContentLoaded', ()=>{
    if (!HHAuth.requerirSesion()) return;
    document.getElementById('userNameHeader').textContent = 'Hola, ' + HHAuth.usuarioActual().nombre;
    document.getElementById('logoutBtn').addEventListener('click', ()=> HHAuth.cerrarSesion());
    HHUI.mostrarReservas(document.getElementById('myBookings'));

    // --- Chat modal ---
    const chatModal = document.getElementById('chatModal');
    const chatMensajes = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatTitulo = document.getElementById('chatTitle');
    const cerrarChat = document.getElementById('closeChat');

    window.mostrarChatModal = function(reserva){
      chatTitulo.textContent = `Chat con ${reserva.trabajadora.nombre} (Reserva ${reserva.id})`;
      chatModal.classList.remove('hidden');
      renderizarMensajes(reserva.mensajes);
      window.chatActualizado = function(mensajes){ renderizarMensajes(mensajes); };
    };

    function renderizarMensajes(mensajes){
      chatMensajes.innerHTML = '';
      mensajes.forEach(m => {
        const d = document.createElement('div');
        d.className = 'mb-3';
        d.innerHTML = `<div class="text-xs text-gray-600">${m.de} • ${new Date(m.ts).toLocaleString()}</div>
                       <div class="p-2 bg-white border rounded mt-1">${m.texto}</div>`;
        chatMensajes.appendChild(d);
      });
      chatMensajes.scrollTop = chatMensajes.scrollHeight;
    }

    cerrarChat.addEventListener('click', ()=> chatModal.classList.add('hidden'));

    chatForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const texto = chatInput.value.trim(); 
      if (!texto) return;
      HH.enviarMensajeChat(texto);
      chatInput.value = '';
    });

    // --- Calificación modal ---
    const modalCalificacion = document.getElementById('ratingModal');
    const cerrarCalificacion = document.getElementById('closeRating');
    const enviarCalificacion = document.getElementById('submitRating');
    let reservaCalificando = null;

    window.mostrarCalificacionModal = function(idReserva){
      reservaCalificando = idReserva;
      modalCalificacion.classList.remove('hidden');
    };

    cerrarCalificacion.addEventListener('click', ()=> modalCalificacion.classList.add('hidden'));

    enviarCalificacion.addEventListener('click', ()=>{
      const puntaje = parseInt(document.getElementById('ratingSelect').value,10);
      const comentario = document.getElementById('ratingComment').value.trim();
      if (!reservaCalificando) return;
      HH.enviarCalificacion(reservaCalificando, puntaje, comentario);
    });
  });
}
