document.addEventListener('DOMContentLoaded', () => {
    const sesion = JSON.parse(localStorage.getItem('usuario_sesion'));

    // 1. Exigir inicio de sesión
    if (!sesion) {
        alert('Debe iniciar sesión para modificar una cita.');
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const index = params.get('index');
    const citas = JSON.parse(localStorage.getItem('citas_migraciones')) || [];

    if (index === null || !citas[index]) {
        alert('Registro de cita no encontrado.');
        window.location.href = 'consulta.html';
        return;
    }

    const cita = citas[index];

    // 2. Control de acceso: Verificar que la cita pertenezca al usuario activo
    if (cita.correo !== sesion.email) {
        alert('Acceso no autorizado: Solo puedes modificar tus propias citas.');
        window.location.href = 'consulta.html';
        return;
    }

    // Cargar datos en el formulario
    document.getElementById('cita-index').value = index;
    document.getElementById('nombres').value = cita.nombres || '';
    document.getElementById('apellidos').value = cita.apellidos || '';
    document.getElementById('sede').value = cita.sede || '';
    document.getElementById('fecha-cita').value = cita.fechaCita || '';
    document.getElementById('horario-cita').value = cita.horarioCita || '';

    // Guardar cambios
    document.getElementById('formActualizar').addEventListener('submit', (e) => {
        e.preventDefault();

        citas[index].nombres = document.getElementById('nombres').value;
        citas[index].apellidos = document.getElementById('apellidos').value;
        citas[index].sede = document.getElementById('sede').value;
        citas[index].fechaCita = document.getElementById('fecha-cita').value;
        citas[index].horarioCita = document.getElementById('horario-cita').value;

        localStorage.setItem('citas_migraciones', JSON.stringify(citas));

        alert('¡Cita actualizada exitosamente!');
        window.location.href = 'consulta.html';
    });
});