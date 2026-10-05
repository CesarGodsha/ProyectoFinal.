import { sql } from './neon-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formRegistro = document.getElementById('formRegistroUsuario');

    // --- INICIAR SESIÓN DESDE NEON ---
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const usuarios = await sql`
                    SELECT * FROM usuarios 
                    WHERE email = ${email} AND password = ${password}
                `;

                if (usuarios.length > 0) {
                    const usuarioValido = usuarios[0];
                    localStorage.setItem('usuario_sesion', JSON.stringify(usuarioValido));
                    alert(`¡Bienvenido! Sesión iniciada como ${usuarioValido.rol}`);

                    if (usuarioValido.rol === 'admin') {
                        window.location.href = 'panel.html';
                    } else {
                        window.location.href = 'consulta.html';
                    }
                } else {
                    alert('Correo o contraseña incorrectos.');
                }
            } catch (error) {
                console.error('Error al iniciar sesión:', error);
                alert('Error al conectar con la base de datos.');
            }
        });
    }

    // --- REGISTRAR USUARIO EN NEON ---
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const rol = document.getElementById('reg-rol').value;

            try {
                // Verificar si ya existe el correo en Neon
                const existe = await sql`SELECT * FROM usuarios WHERE email = ${email}`;
                if (existe.length > 0) {
                    alert('Este correo ya está registrado.');
                    return;
                }

                // Insertar usuario en Neon DB
                await sql`
                    INSERT INTO usuarios (email, password, rol)
                    VALUES (${email}, ${password}, ${rol})
                `;

                alert('Cuenta creada con éxito en Neon DB. Ahora puedes iniciar sesión.');
                formRegistro.reset();

            } catch (error) {
                console.error('Error al registrar usuario:', error);
                alert('Error al guardar el usuario en la base de datos.');
            }
        });
    }
});