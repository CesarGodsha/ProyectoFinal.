import { sql } from './neon-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const formRegistroCita = document.getElementById('formRegistroCita') || document.querySelector('form');

    if (formRegistroCita) {
        formRegistroCita.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Verificar si hay sesión
            const sesion = JSON.parse(localStorage.getItem('usuario_sesion'));
            if (!sesion) {
                alert('Debe iniciar sesión para agendar una cita.');
                window.location.href = 'login.html';
                return;
            }

            // Obtener los datos del formulario
            const correo = sesion.email;
            const nombres = document.getElementById('nombres')?.value || '';
            const apellidos = document.getElementById('apellidos')?.value || '';
            const tipoDoc = document.getElementById('tipo-doc')?.value || 'DNI';
            const documento = document.getElementById('numero-doc')?.value || '';
            const sede = document.getElementById('sede')?.value || 'Sede Central';
            const fechaCita = document.getElementById('fecha-cita')?.value || '';
            const horarioCita = document.getElementById('horario-cita')?.value || '';

            try {
                // Insertar en la tabla citas_migraciones de Neon DB
                await sql`
                    INSERT INTO citas_migraciones 
                    (correo, nombres, apellidos, tipo_doc, documento, sede, fecha_cita, horario_cita)
                    VALUES 
                    (${correo}, ${nombres}, ${apellidos}, ${tipoDoc}, ${documento}, ${sede}, ${fechaCita}, ${horarioCita})
                `;

                alert('¡Cita registrada con éxito en la base de datos!');
                window.location.href = 'consulta.html';

            } catch (error) {
                console.error('Error al registrar la cita en Neon:', error);
                alert('Ocurrió un error al guardar la cita en la base de datos.');
            }
        });
    }
});