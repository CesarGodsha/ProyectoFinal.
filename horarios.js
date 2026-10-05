let sql = null;
let sesion = null;
let empleadosCache = [];

const TURNOS = {
    madrugada: { nombre: 'Madrugada', inicio: 0, fin: 8 },
    dia:       { nombre: 'Día',       inicio: 8, fin: 16 },
    noche:     { nombre: 'Noche',     inicio: 16, fin: 24 }
};

function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function textoTurno(clave) {
    const turno = TURNOS[clave];
    if (!turno) return 'Sin turno';
    const ini = String(turno.inicio).padStart(2, '0') + ':00';
    const fin = String(turno.fin).padStart(2, '0') + ':00';
    return `${turno.nombre} (${ini} - ${fin})`;
}

function turnoActivoAhora() {
    const hora = new Date().getHours();
    let activo = '';
    Object.keys(TURNOS).forEach(clave => {
        if (hora >= TURNOS[clave].inicio && hora < TURNOS[clave].fin) {
            activo = clave;
        }
    });
    return activo;
}

async function iniciar() {
    const tablaBody = document.getElementById('tablaEmpleadosBody');

    try {
        sesion = JSON.parse(localStorage.getItem('usuario_sesion'));
    } catch (error) {
        sesion = null;
    }

    // Solo el administrador puede gestionar horarios
    if (!sesion || sesion.rol !== 'admin') {
        alert('Acceso restringido al administrador.');
        window.location.href = sesion ? 'panel.html' : 'login.html';
        return;
    }

    document.getElementById('user-role-display').textContent = `Admin: ${sesion.email}`;

    document.getElementById('btnCerrarSesion').addEventListener('click', () => {
        localStorage.removeItem('usuario_sesion');
        window.location.href = 'login.html';
    });

    try {
        const modulo = await import('./neon-config.js');
        sql = modulo.sql;
    } catch (error) {
        console.error('No se pudo cargar neon-config.js:', error);
        tablaBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">No se pudo cargar la conexión a Neon: ${escaparHTML(error.message)}</td></tr>`;
        return;
    }

    await cargarEmpleados();
}

async function cargarEmpleados() {
    const tablaBody = document.getElementById('tablaEmpleadosBody');

    try {
        tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">Conectando a Neon DB...</td></tr>';

        const empleados = await sql`
            SELECT email, turno
            FROM usuarios
            WHERE rol = 'empleado'
            ORDER BY email ASC
        `;

        empleadosCache = empleados || [];

        dibujarTarjetas();
        dibujarTabla();

    } catch (error) {
        console.error('Error al consultar empleados:', error);
        tablaBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error de conexión: ${escaparHTML(error.message)}</td></tr>`;
    }
}

function dibujarTarjetas() {
    const contenedor = document.getElementById('rejillaTurnos');
    const activo = turnoActivoAhora();

    contenedor.innerHTML = Object.keys(TURNOS).map(clave => {
        const personal = empleadosCache.filter(emp => emp.turno === clave);

        const lista = personal.length > 0
            ? personal.map(emp => `<li>${escaparHTML(emp.email)}</li>`).join('')
            : '<li class="vacio">Sin empleados asignados</li>';

        const clase = clave === activo ? 'tarjeta-turno activo' : 'tarjeta-turno';
        const etiqueta = clave === activo ? '<span class="etiqueta-ahora">EN CURSO</span>' : '';

        return `
            <div class="${clase}">
                ${etiqueta}
                <h3>${escaparHTML(textoTurno(clave))}</h3>
                <p class="contador">${personal.length} empleado(s)</p>
                <ul>${lista}</ul>
            </div>
        `;
    }).join('');
}

function dibujarTabla() {
    const tablaBody = document.getElementById('tablaEmpleadosBody');
    const activo = turnoActivoAhora();

    if (empleadosCache.length === 0) {
        tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay empleados registrados. Cree uno desde la pantalla de registro.</td></tr>';
        return;
    }

    tablaBody.innerHTML = '';

    empleadosCache.forEach((emp, i) => {
        const enTurnoAhora = emp.turno && emp.turno === activo;
        const badge = enTurnoAhora
            ? '<span class="badge badge-atendido">🟢 En turno</span>'
            : '<span class="badge badge-cancelado">🔴 Fuera de turno</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escaparHTML(emp.email)}</td>
            <td>
                <select id="sel-${i}" class="select-turno">
                    <option value="" ${!emp.turno ? 'selected' : ''}>Sin turno asignado</option>
                    <option value="madrugada" ${emp.turno === 'madrugada' ? 'selected' : ''}>Madrugada (00:00 - 08:00)</option>
                    <option value="dia" ${emp.turno === 'dia' ? 'selected' : ''}>Día (08:00 - 16:00)</option>
                    <option value="noche" ${emp.turno === 'noche' ? 'selected' : ''}>Noche (16:00 - 24:00)</option>
                </select>
            </td>
            <td>${badge}</td>
            <td><button class="btn-editar" onclick="guardarTurno(${i})">Guardar turno</button></td>
        `;
        tablaBody.appendChild(tr);
    });
}

window.guardarTurno = async function(i) {
    const empleado = empleadosCache[i];
    if (!empleado) return;

    const valor = document.getElementById('sel-' + i).value;
    const nuevoTurno = valor === '' ? null : valor;

    try {
        await sql`UPDATE usuarios SET turno = ${nuevoTurno} WHERE email = ${empleado.email}`;
        alert(`Turno de ${empleado.email} actualizado a: ${textoTurno(nuevoTurno)}`);
        await cargarEmpleados();
    } catch (error) {
        console.error('Error al guardar el turno:', error);
        alert('Error al guardar el turno: ' + error.message);
    }
};

iniciar();