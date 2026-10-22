"use strict";

// SISTEMA WEB DE ASIGNACIÓN DE CITAS
// Prototipo académico ADSO.
// Los datos de las citas se guardan en el navegador.
// No reemplaza un backend ni una base de datos compartida.

const formularioRegistro = document.getElementById("formRegistro");
const formularioLogin = document.getElementById("formLogin");
const formularioCita = document.getElementById("formCita");

const listaCitas = document.getElementById("listaCitas");
const campoBusqueda = document.getElementById("buscarCita");

const mensajeRegistro = document.getElementById("mensajeRegistro");
const mensajeLogin = document.getElementById("mensajeLogin");
const mensajeCita = document.getElementById("mensajeCita");
const mensajeTabla = document.getElementById("mensajeTabla");

const campoFecha = document.getElementById("fechaCita");

// Las cuentas de demostración viven solo en memoria.
// No se guardan contraseñas en localStorage.
const usuarios = [];

let usuarioActual = null;

// Cargar citas guardadas en el navegador.
function cargarCitas() {
    try {
        const datos = JSON.parse(
            localStorage.getItem("citasADSO") || "[]"
        );

        return Array.isArray(datos) ? datos : [];
    } catch {
        return [];
    }
}

let citas = cargarCitas();

// GUARDAR CITAS
function guardarCitas() {
    try {
        localStorage.setItem("citasADSO", JSON.stringify(citas));
        return true;
    } catch {
        mensajeCita.textContent =
            "No fue posible guardar los datos en el navegador.";
        return false;
    }
}

// MOSTRAR MENSAJES
function mostrarMensaje(elemento, texto, correcto = false) {
    elemento.textContent = texto;
    elemento.style.color = correcto ? "#047857" : "#b91c1c";
}

// FECHA MÍNIMA: HOY
function actualizarFechaMinima() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");

    campoFecha.min = `${anio}-${mes}-${dia}`;
}

actualizarFechaMinima();

// REGISTRO DE USUARIO: DEMOSTRACIÓN
formularioRegistro.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nombre = document
        .getElementById("nombreRegistro")
        .value.trim();

    const correo = document
        .getElementById("correoRegistro")
        .value.trim()
        .toLowerCase();

    const clave = document.getElementById("claveRegistro").value;

    if (!nombre || !correo || clave.length < 8) {
        mostrarMensaje(
            mensajeRegistro,
            "Completa los campos y utiliza una contraseña de al menos 8 caracteres."
        );
        return;
    }

    const existe = usuarios.some(usuario => usuario.correo === correo);

    if (existe) {
        mostrarMensaje(
            mensajeRegistro,
            "Este correo ya está registrado en esta sesión de demostración."
        );
        return;
    }

    // Cuenta temporal: no se persiste la contraseña.
    usuarios.push({ nombre, correo, clave });

    formularioRegistro.reset();

    mostrarMensaje(
        mensajeRegistro,
        "Registro de demostración exitoso. Ahora puedes iniciar sesión.",
        true
    );
});

// INICIO DE SESIÓN: DEMOSTRACIÓN
formularioLogin.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const correo = document
        .getElementById("correoLogin")
        .value.trim()
        .toLowerCase();

    const clave = document.getElementById("claveLogin").value;

    const usuario = usuarios.find(
        elemento =>
            elemento.correo === correo &&
            elemento.clave === clave
    );

    if (!usuario) {
        mostrarMensaje(
            mensajeLogin,
            "No se encontró la cuenta en esta sesión. Regístrate primero."
        );
        return;
    }

    usuarioActual = usuario;

    // Autocompletar los datos para agendar una cita.
    document.getElementById("nombrePaciente").value = usuario.nombre;
    document.getElementById("correoPaciente").value = usuario.correo;

    formularioLogin.reset();

    mostrarMensaje(
        mensajeLogin,
        `Bienvenido, ${usuario.nombre}. Ya puedes registrar una cita.`,
        true
    );
});

// COMBINAR FECHA Y HORA COMO HORA LOCAL DEL NAVEGADOR
function obtenerFechaHora(fecha, hora) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);

    return new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
}

// REGISTRAR UNA CITA
formularioCita.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const nombre = document
        .getElementById("nombrePaciente")
        .value.trim();

    const correo = document
        .getElementById("correoPaciente")
        .value.trim()
        .toLowerCase();

    const servicio = document.getElementById("servicio").value;
    const fecha = campoFecha.value;
    const hora = document.getElementById("horaCita").value;

    if (!nombre || !correo || !servicio || !fecha || !hora) {
        mostrarMensaje(
            mensajeCita,
            "Completa todos los campos antes de continuar."
        );
        return;
    }

    const fechaSeleccionada = obtenerFechaHora(fecha, hora);

    if (fechaSeleccionada.getTime() <= Date.now()) {
        mostrarMensaje(
            mensajeCita,
            "Selecciona una fecha y hora futuras."
        );
        return;
    }

    // Evitar reservar un horario que ya tenga una cita activa.
    const horarioOcupado = citas.some(cita =>
        cita.fecha === fecha &&
        cita.hora === hora &&
        cita.estado !== "Cancelada"
    );

    if (horarioOcupado) {
        mostrarMensaje(
            mensajeCita,
            "Este horario ya está ocupado. Selecciona otro."
        );
        return;
    }

    const nuevaCita = {
        id: crypto.randomUUID(),
        nombre,
        correo,
        servicio,
        fecha,
        hora,
        estado: "Pendiente",
        creada: new Date().toISOString()
    };

    citas.push(nuevaCita);

    if (!guardarCitas()) {
        citas.pop();
        return;
    }

    formularioCita.reset();
    actualizarFechaMinima();

    mostrarMensaje(
        mensajeCita,
        "Cita registrada correctamente.",
        true
    );

    renderizarCitas();
});

// FORMATEAR FECHA PARA MOSTRARLA
function formatearFecha(fecha) {
    const [anio, mes, dia] = fecha.split("-").map(Number);

    return new Date(anio, mes - 1, dia).toLocaleDateString("es-CO");
}

// MOSTRAR Y BUSCAR CITAS
function renderizarCitas() {
    listaCitas.replaceChildren();

    const termino = campoBusqueda.value.trim().toLowerCase();

    const resultados = citas.filter(cita =>
        cita.nombre.toLowerCase().includes(termino)
    );

    mensajeTabla.textContent =
        `Total de citas encontradas: ${resultados.length}`;

    if (resultados.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.textContent = "No hay citas registradas.";

        fila.appendChild(celda);
        listaCitas.appendChild(fila);
        return;
    }

    resultados.forEach(cita => {
        const fila = document.createElement("tr");

        function crearCelda(texto) {
            const celda = document.createElement("td");
            celda.textContent = texto;
            fila.appendChild(celda);
            return celda;
        }

        crearCelda(cita.nombre);
        crearCelda(cita.servicio);
        crearCelda(formatearFecha(cita.fecha));
        crearCelda(cita.hora);

        const celdaEstado = crearCelda("");
        const etiqueta = document.createElement("span");

        etiqueta.className = "state-label";
        etiqueta.textContent = cita.estado;

        celdaEstado.appendChild(etiqueta);

        const celdaAccion = crearCelda("");

        if (cita.estado !== "Cancelada") {
            const boton = document.createElement("button");

            boton.type = "button";
            boton.className = "cancel-button";
            boton.textContent = "Cancelar";

            boton.addEventListener("click", function () {
                cancelarCita(cita.id);
            });

            celdaAccion.appendChild(boton);
        }

        listaCitas.appendChild(fila);
    });
}

// CANCELACIÓN CON 24 HORAS DE ANTICIPACIÓN
function cancelarCita(id) {
    const cita = citas.find(elemento => elemento.id === id);

    if (!cita || cita.estado === "Cancelada") {
        return;
    }

    const fechaCita = obtenerFechaHora(cita.fecha, cita.hora);
    const horasRestantes =
        (fechaCita.getTime() - Date.now()) / (1000 * 60 * 60);

    if (horasRestantes < 24) {
        alert(
            "Esta cita no se puede cancelar desde el prototipo: " +
            "deben faltar al menos 24 horas."
        );
        return;
    }

    const confirmar = window.confirm(
        `¿Deseas cancelar la cita de ${cita.nombre}?`
    );

    if (!confirmar) {
        return;
    }

    cita.estado = "Cancelada";

    if (!guardarCitas()) {
        cita.estado = "Pendiente";
        return;
    }

    renderizarCitas();

    mostrarMensaje(
        mensajeCita,
        "La cita se canceló correctamente.",
        true
    );
}

// BUSCADOR EN TIEMPO REAL
campoBusqueda.addEventListener("input", renderizarCitas);

// INICIAR LA INTERFAZ
renderizarCitas();