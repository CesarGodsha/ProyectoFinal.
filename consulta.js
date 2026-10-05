document.addEventListener('DOMContentLoaded', () => {
    const sesion = JSON.parse(localStorage.getItem('usuario_sesion'));

    if (!sesion) {
        alert('Debe iniciar sesión para ver sus trámites.');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('infoUsuario').textContent = sesion.email;

    document.getElementById('btnCerrarSesion').addEventListener('click', () => {
        localStorage.removeItem('usuario_sesion');
        window.location.href = 'login.html';
    });

    const contenedor = document.getElementById('contenedorCitas');
    const todasLasCitas = JSON.parse(localStorage.getItem('citas_migraciones')) || [];

    // Filtrar citas correspondientes al usuario actual
    const misCitas = todasLasCitas.filter(c => c.correo === sesion.email || sesion.rol === 'admin');

    if (misCitas.length === 0) {
        contenedor.innerHTML = '<p>No registra citas activas actualmente. <a href="registro.html">Agende una aquí</a>.</p>';
        return;
    }

    contenedor.innerHTML = misCitas.map((cita, index) => `
        <div class="tarjeta-cita">
            <h3>📍 ${cita.sede || 'Sede Central'}</h3>
            <p><strong>Titular:</strong> ${cita.nombres} ${cita.apellidos}</p>
            <p><strong>Documento:</strong> ${cita.tipoDoc || 'DNI'} ${cita.documento}</p>
            <p><strong>Fecha de Cita:</strong> ${cita.fechaCita}</p>
            <p><strong>Horario:</strong> ${cita.horarioCita}</p>
            <a href="actualizar.html?index=${index}" class="boton-editar">✏️ Modificar Cita</a>
        </div>
    `).join('');
});