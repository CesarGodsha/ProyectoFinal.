export const TURNOS = {
    madrugada: { nombre: 'Madrugada', inicio: 0, fin: 8 },
    dia:       { nombre: 'Día',       inicio: 8, fin: 16 },
    noche:     { nombre: 'Noche',     inicio: 16, fin: 24 }
};

export function enTurno(clave) {
    const turno = TURNOS[clave];
    if (!turno) return false;
    const hora = new Date().getHours();
    return hora >= turno.inicio && hora < turno.fin;
}

export function textoTurno(clave) {
    const turno = TURNOS[clave];
    if (!turno) return 'Sin turno';
    const ini = String(turno.inicio).padStart(2, '0') + ':00';
    const fin = String(turno.fin).padStart(2, '0') + ':00';
    return `${turno.nombre} (${ini} - ${fin})`;
}