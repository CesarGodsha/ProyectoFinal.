let sql = null;
let sesion = null;
let citasCache = [];

// ---------- TURNOS (incluidos aquí para no depender de otro archivo) ----------
const TURNOS = {
    madrugada: { nombre: 'Madrugada', inicio: 0, fin: 8 },
    dia:       { nombre: 'Día',       inicio: 8, fin: 16 },
    noche:     { nombre: 'Noche',     inicio: 16, fin: 24 }
};

function enTurno(clave) {
    const turno = TURNOS[clave];
    if (!turno) return false;
    const hora = new Date().getHours();
    return hora >= turno.inicio && hora < turno.fin;
}

function textoTurno(clave) {
    const turno = TURNOS[clave];
    if (!turno) return 'Sin turno';
    const ini = String(turno.inicio).padStart(2, '0') + ':00';
    const fin = String(turno.fin).padStart(2, '0') + ':00';
    return `${turno.nombre} (${ini} - ${fin})`;
}

// ---------- UTILIDADES ----------
function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function puedeGestionar() {
    return sesion.rol === 'admin' || enTurno(sesion.turno);
}

function getBadgeClass(estado) {
    const status = String(estado).toLowerCase();
    if (status.includes('atend')) return 'badge-atendido';
    if (status.includes('canc')) return 'badge-cancelado';
    return 'badge-pendiente';
}

// ---------- INICIO ----------
async function iniciar() {
    const tablaBody = document.getElementById('tablaCitasBody');

    // 1. Leer la sesión
    try {
        sesion = JSON.parse(localStorage.getItem('usuario_sesion'));
    } catch (error) {
        sesion = null;
    }

    if (!sesion || (sesion.rol !== 'admin' && sesion.rol !== 'empleado')) {
        alert('Acceso restringido al personal autorizado.');
        window.location.href = 'login.html';
        return;
    }

    // 2. Mostrar quién está conectado
    const userDisplay = document.getElementById('user-role-display');
    if (userDisplay) {
        if (sesion.rol === 'admin') {
            userDisplay.textContent = `Admin: ${sesion.email}`;
        } else {
            const estado = enTurno(sesion.turno) ? '🟢 En turno' : '🔴 Fuera de turno';
            userDisplay.textContent = `Empleado: ${sesion.email} | ${textoTurno(sesion.turno)} | ${estado}`;
        }
    }

    // 3. Botón de cerrar sesión
    const btnLogout = document.getElementById('btnCerrarSesion');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuario_sesion');
            window.location.href = 'login.html';
        });
    }

    // 4. Eventos de la ventana de edición (si existe en el HTML)
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    const modal = document.getElementById('modalEditar');
    const formEditar = document.getElementById('formEditarCita');

    if (btnCancelar) {
        btnCancelar.addEventListener('click', cerrarModal);
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'modalEditar') {
                cerrarModal();
            }
        });
    }
    if (formEditar) {
        formEditar.addEventListener('submit', guardarEdicion);
    }

    // 5. Cargar la conexión a Neon (si falla, se muestra el error en pantalla)
    try {
        const modulo = await import('./neon-config.js');
        sql = modulo.sql;
    } catch (error) {
        console.error('No se pudo cargar neon-config.js:', error);
        if (tablaBody) {
            tablaBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">No se pudo cargar la conexión a Neon: ${escaparHTML(error.message)}</td></tr>`;
        }
        return;
    }

    await cargarCitasDesdeNeon();
}

// ---------- TABLA ----------
async function cargarCitasDesdeNeon() {
    const tablaBody = document.getElementById('tablaCitasBody');
    if (!tablaBody) return;

    try {
        tablaBody.innerHTML = '<tr><td colspan="8" class="text-center">Conectando a Neon DB...</td></tr>';

        const citas = await sql`
            SELECT id, nombres, apellidos, correo, tipo_doc, documento, sede,
                   fecha_cita::text AS fecha_cita, horario_cita, estado
            FROM citas_migraciones
            ORDER BY id ASC
        `;

        citasCache = citas || [];

        if (citasCache.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="8" class="text-center">No existen registros en el sistema.</td></tr>';
            return;
        }

        tablaBody.innerHTML = '';
        const habilitado = puedeGestionar();

        citasCache.forEach(cita => {
            const fechaLimpia = cita.fecha_cita ? String(cita.fecha_cita).split('T')[0] : 'Sin fecha';
            const solicitante = (cita.nombres && cita.apellidos)
                ? `${cita.nombres} ${cita.apellidos}`
                : cita.correo || 'N/A';

            const estadoCita = cita.estado || 'Pendiente';
            const badgeClass = getBadgeClass(estadoCita);
            const textoBoton = sesion.rol === 'admin' ? 'Editar' : 'Cambiar estado';

            const botonEditar = habilitado
                ? `<button class="btn-editar" onclick="editarCita(${cita.id})">${textoBoton}</button>`
                : `<button class="btn-editar" disabled title="Fuera de tu turno">Fuera de turno</button>`;

            const botonEliminar = sesion.rol === 'admin'
                ? `<button class="btn-eliminar" onclick="eliminarCita(${cita.id})">Eliminar</button>`
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${cita.id}</strong></td>
                <td>${escaparHTML(solicitante)}</td>
                <td>${escaparHTML(cita.documento || 'N/A')}</td>
                <td>${escaparHTML(cita.sede || 'N/A')}</td>
                <td>${escaparHTML(fechaLimpia)}</td>
                <td>${escaparHTML(cita.horario_cita || 'N/A')}</td>
                <td><span class="badge ${badgeClass}">${escaparHTML(estadoCita)}</span></td>
                <td>${botonEditar} ${botonEliminar}</td>
            `;
            tablaBody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error al consultar Neon DB:', error);
        tablaBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error de conexión: ${escaparHTML(error.message)}</td></tr>`;
    }
}

// ---------- VENTANA DE EDICIÓN ----------
function abrirModal(cita) {
    document.getElementById('edit-id').value = cita.id;
    document.getElementById('modal-id').textContent = '#' + cita.id;
    document.getElementById('edit-nombres').value = cita.nombres || '';
    document.getElementById('edit-apellidos').value = cita.apellidos || '';
    document.getElementById('edit-tipo-doc').value = cita.tipo_doc || 'DNI';
    document.getElementById('edit-documento').value = cita.documento || '';
    document.getElementById('edit-correo').value = cita.correo || '';
    document.getElementById('edit-sede').value = cita.sede || 'Sede Central - Breña';
    document.getElementById('edit-fecha').value = cita.fecha_cita ? String(cita.fecha_cita).split('T')[0] : '';
    document.getElementById('edit-horario').value = cita.horario_cita || '08:00 AM - 10:00 AM';
    document.getElementById('edit-estado').value = cita.estado || 'Pendiente';

    // Los empleados solo pueden cambiar el estado
    const camposAdmin = document.querySelectorAll('[data-admin]');
    camposAdmin.forEach(campo => {
        campo.disabled = sesion.rol !== 'admin';
    });

    const aviso = document.getElementById('modal-aviso');
    if (sesion.rol === 'admin') {
        aviso.textContent = 'Como administrador puedes modificar todos los datos de la cita.';
    } else {
        aviso.textContent = 'Como empleado solo puedes cambiar el estado de la cita durante tu turno.';
    }

    document.getElementById('modalEditar').classList.add('abierto');
}

function cerrarModal() {
    document.getElementById('modalEditar').classList.remove('abierto');
}

async function guardarEdicion(e) {
    e.preventDefault();

    if (!puedeGestionar()) {
        alert(`Fuera de turno. Tu turno es: ${textoTurno(sesion.turno)}`);
        cerrarModal();
        await cargarCitasDesdeNeon();
        return;
    }

    const id = Number(document.getElementById('edit-id').value);
    const estado = document.getElementById('edit-estado').value;

    try {
        if (sesion.rol === 'admin') {
            const nombres = document.getElementById('edit-nombres').value;
            const apellidos = document.getElementById('edit-apellidos').value;
            const tipoDoc = document.getElementById('edit-tipo-doc').value;
            const documento = document.getElementById('edit-documento').value;
            const correo = document.getElementById('edit-correo').value;
            const sede = document.getElementById('edit-sede').value;
            const fechaCita = document.getElementById('edit-fecha').value;
            const horarioCita = document.getElementById('edit-horario').value;

            await sql`
                UPDATE citas_migraciones
                SET nombres = ${nombres},
                    apellidos = ${apellidos},
                    tipo_doc = ${tipoDoc},
                    documento = ${documento},
                    correo = ${correo},
                    sede = ${sede},
                    fecha_cita = ${fechaCita},
                    horario_cita = ${horarioCita},
                    estado = ${estado}
                WHERE id = ${id}
            `;
        } else {
            await sql`UPDATE citas_migraciones SET estado = ${estado} WHERE id = ${id}`;
        }

        alert(`Cita #${id} actualizada correctamente.`);
        cerrarModal();
        await cargarCitasDesdeNeon();

    } catch (err) {
        console.error('Error al actualizar:', err);
        alert('Error al actualizar: ' + err.message);
    }
}

// ---------- BOTONES DE LA TABLA ----------
window.editarCita = function(id) {
    if (!puedeGestionar()) {
        alert(`Fuera de turno. Tu turno es: ${textoTurno(sesion.turno)}`);
        cargarCitasDesdeNeon();
        return;
    }

    const cita = citasCache.find(c => c.id === id);
    if (!cita) {
        alert('No se encontró la cita.');
        return;
    }

    abrirModal(cita);
};

window.eliminarCita = async function(id) {
    if (sesion.rol !== 'admin') {
        alert('Solo el administrador puede eliminar citas.');
        return;
    }
    if (confirm(`¿Estás seguro de eliminar la cita #${id}?`)) {
        try {
            await sql`DELETE FROM citas_migraciones WHERE id = ${id}`;
            alert('Cita eliminada correctamente.');
            cargarCitasDesdeNeon();
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    }
};

iniciar();