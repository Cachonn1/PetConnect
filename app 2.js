/* =========================================================
   SISTEMA DE FACTURACIÓN — PETCONNECT
   ========================================================= */

let listaProductosCarrito = [];
let clienteFacturaActual = ""; // Cliente del carrito activo

// Datos que se guardan durante la sesión (sobreviven al recargar la página)
let historialFacturas = leerStorage("facturas");
let listaConsultas = leerStorage("consultas");
let ultimaCotizacion = null;

/* =========================================================
   UTILIDADES
   ========================================================= */
function leerStorage(clave) {
    try {
        return JSON.parse(sessionStorage.getItem(clave)) || [];
    } catch (e) {
        return [];
    }
}

function guardarStorage(clave, datos) {
    sessionStorage.setItem(clave, JSON.stringify(datos));
}

function formatoPesos(numero) {
    return `$${Number(numero).toLocaleString("es-CO")}`;
}

function crear(etiqueta, texto, estilo) {
    const el = document.createElement(etiqueta);
    if (texto !== undefined) el.textContent = texto;
    if (estilo) el.style.cssText = estilo;
    return el;
}

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       1. LOGIN Y VERIFICACIÓN DE SESIÓN
       ===================================================== */
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const usuario = document.getElementById("usuario").value.trim().toLowerCase();
            const password = document.getElementById("password").value.trim();
            const errorMsg = document.getElementById("errorMsg");

            if ((usuario === "dani" || usuario === "admin") && password === "1234") {
                sessionStorage.setItem("usuarioLogueado", usuario);
                window.location.href = "factura 2.html";
            } else {
                if (errorMsg) errorMsg.style.display = "block";
            }
        });
    }

    const nombreUsuarioSpan = document.getElementById("nombreUsuario");

    if (nombreUsuarioSpan) {
        const usuarioSesion = sessionStorage.getItem("usuarioLogueado");

        if (!usuarioSesion) {
            window.location.href = "index 2.html";
            return;
        }

        nombreUsuarioSpan.textContent = usuarioSesion;

        // Logout
        const btnLogout = document.getElementById("btnLogout");
        if (btnLogout) {
            btnLogout.addEventListener("click", () => {
                sessionStorage.clear();
                window.location.href = "index 2.html";
            });
        }

        /* =====================================================
           2. PESTAÑAS (NAVEGACIÓN ENTRE VISTAS)
           ===================================================== */
        document.querySelectorAll(".menu-btn").forEach((boton) => {
            boton.addEventListener("click", () => activarVista(boton.dataset.vista));
        });

        // Botones de "Accesos rápidos" en Inicio
        document.querySelectorAll("[data-ir]").forEach((boton) => {
            boton.addEventListener("click", () => activarVista(boton.dataset.ir));
        });

        activarVista("vistaInicio");

        /* =====================================================
           3. VALIDACIÓN AL CAMBIAR EL NOMBRE DEL CLIENTE
           ===================================================== */
        const inputCliente = document.getElementById("cliente");
        if (inputCliente) {
            inputCliente.addEventListener("change", (e) => {
                const nuevoCliente = e.target.value.trim() || "Cliente General";

                if (listaProductosCarrito.length > 0 && clienteFacturaActual !== "" && clienteFacturaActual !== nuevoCliente) {
                    alert(`⚠️ Ya tienes productos agregados para "${clienteFacturaActual}".\nPor favor procesa la factura actual antes de iniciar el pedido de otro cliente.`);
                    inputCliente.value = clienteFacturaActual;
                }
            });

            /* =========================================================
               CONTENIDO COMPARTIDO CON LA PÁGINA DE CLIENTES
               ========================================================= */
            function leerStorageLocal(clave) {
                try {
                    return JSON.parse(localStorage.getItem(clave)) || [];
                } catch (e) {
                    return [];
                }
            }

            function guardarStorageLocal(clave, datos) {
                localStorage.setItem(clave, JSON.stringify(datos));
            }

            function inicializarComunidadAdmin() {
                const petForm = document.getElementById("adminPetForm");
                const productForm = document.getElementById("adminProductForm");

                if (!petForm || !productForm) return;

                renderizarMascotasAdmin();
                renderizarSolicitudesAdmin();

                petForm.addEventListener("submit", (e) => {
                    e.preventDefault();

                    const nombre = document.getElementById("adminPetName").value.trim();
                    const ciudad = document.getElementById("adminPetCity").value.trim();
                    const descripcion = document.getElementById("adminPetDescription").value.trim();

                    if (!nombre || !ciudad || !descripcion) {
                        mostrarMensajeComunidad("Completa todos los datos de la mascota.", true);
                        return;
                    }

                    const especie = document.getElementById("adminPetSpecies").value;
                    const mascotas = leerStorageLocal("petconnect_mascotas");
                    mascotas.push({
                        id: Date.now(),
                        nombre,
                        especie,
                        edad: document.getElementById("adminPetAge").value,
                        edadTexto: "Edad por confirmar",
                        tamaño: document.getElementById("adminPetSize").value,
                        ciudad,
                        emoji: especie === "Gato" ? "🐱" : "🐶",
                        clase: especie === "Gato" ? "cat" : "dog",
                        descripcion,
                        publicadoPor: "administrador"
                    });
                    guardarStorageLocal("petconnect_mascotas", mascotas);
                    petForm.reset();
                    renderizarMascotasAdmin();
                    mostrarMensajeComunidad("Mascota publicada. Ya está disponible en la página de clientes.");
                });

                productForm.addEventListener("submit", (e) => {
                    e.preventDefault();

                    const nombre = document.getElementById("adminProductName").value.trim();
                    const descripcion = document.getElementById("adminProductDescription").value.trim();
                    const precio = Number(document.getElementById("adminProductPrice").value);

                    if (!nombre || !descripcion || !Number.isFinite(precio) || precio <= 0) {
                        mostrarMensajeComunidad("Ingresa un producto, descripción y precio válidos.", true);
                        return;
                    }

                    const productos = leerStorageLocal("petconnect_productos");
                    productos.push({
                        id: Date.now(),
                        nombre,
                        descripcion,
                        emoji: document.getElementById("adminProductEmoji").value.trim() || "🐾",
                        precio
                    });
                    guardarStorageLocal("petconnect_productos", productos);
                    productForm.reset();
                    document.getElementById("adminProductEmoji").value = "🐾";
                    mostrarMensajeComunidad("Producto agregado al catálogo público.");
                });
            }

            function renderizarMascotasAdmin() {
                const lista = document.getElementById("adminPetsList");
                if (!lista) return;

                const mascotas = leerStorageLocal("petconnect_mascotas");
                if (mascotas.length === 0) {
                    lista.innerHTML = '<p class="texto-vacio">Aún no hay publicaciones propias. Las mascotas de ejemplo siguen visibles en el portal.</p>';
                    return;
                }

                lista.innerHTML = mascotas.map((mascota) => `
                    <div class="community-item">
                        <div><strong>${mascota.emoji} ${mascota.nombre}</strong><small>${mascota.especie} · ${mascota.ciudad}</small></div>
                        <button class="community-delete" type="button" data-delete-pet="${mascota.id}">Eliminar</button>
                    </div>
                `).join("");

                lista.querySelectorAll("[data-delete-pet]").forEach((button) => {
                    button.addEventListener("click", () => {
                        const id = Number(button.dataset.deletePet);
                        const mascotasActualizadas = leerStorageLocal("petconnect_mascotas").filter((mascota) => mascota.id !== id);
                        guardarStorageLocal("petconnect_mascotas", mascotasActualizadas);
                        renderizarMascotasAdmin();
                        mostrarMensajeComunidad("Publicación eliminada del portal cliente.");
                    });
                });
            }

            function renderizarSolicitudesAdmin() {
                const lista = document.getElementById("adminRequestsList");
                if (!lista) return;

                const solicitudes = leerStorageLocal("petconnect_solicitudes");
                if (solicitudes.length === 0) {
                    lista.innerHTML = '<p class="texto-vacio">No hay solicitudes pendientes.</p>';
                    return;
                }

                lista.innerHTML = solicitudes.map((solicitud) => `
                    <div class="community-item request-item">
                        <div>
                            <strong>${solicitud.tipo}: ${solicitud.mascota || solicitud.producto || solicitud.nombre || "Solicitud"}</strong>
                            <small>${solicitud.cliente || "Cliente"} · ${solicitud.email || "Sin correo"} · ${solicitud.fecha}</small>
                            <small>Estado: ${solicitud.estado}</small>
                        </div>
                        <div class="request-actions">
                            <button class="btn-api" type="button" data-request-status="Aprobada" data-request-id="${solicitud.id}">Aprobar</button>
                            <button class="community-delete" type="button" data-request-status="Rechazada" data-request-id="${solicitud.id}">Rechazar</button>
                        </div>
                    </div>
                `).join("");

                lista.querySelectorAll("[data-request-status]").forEach((button) => {
                    button.addEventListener("click", () => {
                        const id = Number(button.dataset.requestId);
                        const estado = button.dataset.requestStatus;
                        const solicitudes = leerStorageLocal("petconnect_solicitudes");
                        const solicitud = solicitudes.find((item) => item.id === id);
                        if (!solicitud) return;

                        if (estado === "Aprobada" && solicitud.tipo === "Publicación de mascota" && !solicitud.mascotaPublicadaId) {
                            const mascotas = leerStorageLocal("petconnect_mascotas");
                            const mascotaPublicada = {
                                id: Date.now(),
                                nombre: solicitud.nombre,
                                especie: solicitud.especie,
                                edad: "Por confirmar",
                                edadTexto: "Edad por confirmar",
                                tamaño: "Mediano",
                                ciudad: solicitud.ciudad,
                                emoji: solicitud.especie === "Gato" ? "🐱" : "🐶",
                                clase: solicitud.especie === "Gato" ? "cat" : "dog",
                                descripcion: solicitud.descripcion,
                                publicadoPor: solicitud.cliente
                            };
                            guardarStorageLocal("petconnect_mascotas", [...mascotas, mascotaPublicada]);
                            solicitud.mascotaPublicadaId = mascotaPublicada.id;
                        }

                        solicitud.estado = estado;
                        const solicitudesActualizadas = solicitudes.map((item) => item.id === id ? solicitud : item);
                        guardarStorageLocal("petconnect_solicitudes", solicitudesActualizadas);
                        renderizarSolicitudesAdmin();
                        renderizarMascotasAdmin();
                        mostrarMensajeComunidad(`Solicitud marcada como ${button.dataset.requestStatus.toLowerCase()}.`);
                    });
                });
            }

            function mostrarMensajeComunidad(mensaje, error = false) {
                const contenedor = document.getElementById("adminCommunityMessage");
                if (!contenedor) return;

                contenedor.textContent = mensaje;
                contenedor.style.display = "block";
                contenedor.style.backgroundColor = error ? "#f8e3dc" : "#d4edda";
                contenedor.style.color = error ? "#a63f22" : "#155724";
                window.setTimeout(() => {
                    contenedor.style.display = "none";
                }, 4000);
            }

            inicializarComunidadAdmin();
            window.addEventListener("storage", (event) => {
                if (event.key === "petconnect_solicitudes") renderizarSolicitudesAdmin();
            });
        }

        /* =====================================================
           4. AGREGAR Y MANEJAR PRODUCTOS
           ===================================================== */
        const btnAdd = document.getElementById("btnAddProducto");
        if (btnAdd) {
            btnAdd.addEventListener("click", () => {
                const nombreInput = document.getElementById("nombreProducto");
                const precioInput = document.getElementById("precioProducto");
                const clienteInput = document.getElementById("cliente");

                const nombre = nombreInput.value.trim();
                const precio = parseFloat(precioInput.value);
                const clienteActual = clienteInput ? clienteInput.value.trim() || "Cliente General" : "Cliente General";

                if (validarCambioCliente(clienteActual)) return;

                if (nombre !== "" && !isNaN(precio) && precio > 0) {
                    clienteFacturaActual = clienteActual;
                    listaProductosCarrito.push({ nombre: nombre, precio: precio });

                    nombreInput.value = "";
                    precioInput.value = "";
                    renderizarTabla();
                    nombreInput.focus();
                } else {
                    alert("Ingrese un nombre y precio válidos para agregar.");
                }
            });
        }

        const btnFacturar = document.getElementById("btnGenerarFactura");
        if (btnFacturar) {
            btnFacturar.addEventListener("click", procesarFactura);
        }

        /* =====================================================
           5. CONSULTAS Y SOLICITUDES
           ===================================================== */
        const nuevoForm = document.getElementById("nuevoFormulario");
        if (nuevoForm) {
            nuevoForm.addEventListener("submit", (e) => {
                e.preventDefault();
                registrarConsulta();
            });
        }
        renderizarConsultas();

        /* =====================================================
           6. IMPRESIÓN Y ENCUADERNACIÓN
           ===================================================== */
        const btnCotizar = document.getElementById("btnCotizar");
        if (btnCotizar) btnCotizar.addEventListener("click", calcularCotizacion);

        const btnAgregarCot = document.getElementById("btnAgregarCotizacion");
        if (btnAgregarCot) btnAgregarCot.addEventListener("click", agregarCotizacionAFactura);

        /* =====================================================
           7. HISTORIAL Y CARGA DE APIS
           ===================================================== */
        renderizarHistorial();
        renderizarTabla();
        cargarProductosAPI();

        const btnCargarClientesAPI = document.getElementById("btnCargarClientesAPI") || document.getElementById("btnCargarUsuariosAPI");
        if (btnCargarClientesAPI) {
            btnCargarClientesAPI.addEventListener("click", cargarUsuariosAPI);
        }
    }
});

/* =========================================================
   CONTROL DE PESTAÑAS
   ========================================================= */
function activarVista(idVista) {
    document.querySelectorAll(".view-section").forEach((seccion) => {
        seccion.classList.toggle("active", seccion.id === idVista);
    });

    document.querySelectorAll(".menu-btn").forEach((boton) => {
        boton.classList.toggle("active", boton.dataset.vista === idVista);
    });

    // Refrescar datos al entrar en cada vista
    if (idVista === "vistaInicio") actualizarInicio();
    if (idVista === "vistaHistorial") renderizarHistorial();
    if (idVista === "vistaConsultas") renderizarConsultas();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =========================================================
   INICIO (RESUMEN)
   ========================================================= */
function actualizarInicio() {
    const totalVendido = historialFacturas.reduce((acc, f) => acc + f.total, 0);

    document.getElementById("statFacturas").textContent = historialFacturas.length;
    document.getElementById("statVentas").textContent = formatoPesos(totalVendido);
    document.getElementById("statConsultas").textContent = listaConsultas.length;
    document.getElementById("statCarrito").textContent = listaProductosCarrito.length;
}

/* =========================================================
   VALIDAR CLIENTE ACTIVO
   ========================================================= */
function validarCambioCliente(nuevoCliente) {
    if (listaProductosCarrito.length > 0 && clienteFacturaActual !== "" && clienteFacturaActual !== nuevoCliente) {
        alert(`⚠️ Ya tienes productos agregados para "${clienteFacturaActual}".\nProcese primero esta factura para luego crear otra con el cliente "${nuevoCliente}".`);

        const inputCliente = document.getElementById("cliente");
        if (inputCliente) inputCliente.value = clienteFacturaActual;
        return true;
    }
    return false;
}

/* =========================================================
   TABLA Y FACTURA
   ========================================================= */
function procesarFactura() {
    const facturaCard = document.getElementById("facturaCard");

    if (listaProductosCarrito.length === 0) {
        if (facturaCard) facturaCard.style.display = "none";
        alert("Debe agregar al menos un producto.");
        return;
    }

    const clienteInput = document.getElementById("cliente");
    const descuentoInput = document.getElementById("descuento");

    const nombreCliente = clienteInput ? clienteInput.value.trim() || "Cliente General" : "Cliente General";
    const porcentajeDesc = descuentoInput ? parseFloat(descuentoInput.value) || 0 : 0;
    const descuentoDecimal = porcentajeDesc / 100;

    const subtotal = listaProductosCarrito.reduce((acc, p) => acc + p.precio, 0);
    const total = subtotal * (1 - descuentoDecimal);

    document.getElementById("resCliente").textContent = nombreCliente;
    document.getElementById("resCantidad").textContent = listaProductosCarrito.length;
    document.getElementById("resSubtotal").textContent = formatoPesos(subtotal);
    document.getElementById("resDescuento").textContent = `${porcentajeDesc}%`;
    document.getElementById("resTotal").textContent = formatoPesos(total);

    if (facturaCard) facturaCard.style.display = "block";

    // Guardar la factura en el historial (copia de los productos)
    historialFacturas.push({
        numero: `F-${String(historialFacturas.length + 1).padStart(3, "0")}`,
        fecha: new Date().toLocaleString("es-CO"),
        cliente: nombreCliente,
        productos: listaProductosCarrito.map((p) => ({ nombre: p.nombre, precio: p.precio })),
        porcentajeDesc: porcentajeDesc,
        subtotal: subtotal,
        total: total
    });
    guardarStorage("facturas", historialFacturas);

    // Reiniciar carrito y cliente
    listaProductosCarrito = [];
    clienteFacturaActual = "";
    renderizarTabla();
    renderizarHistorial();
}

function renderizarTabla() {
    const tbody = document.getElementById("tablaProductos");
    if (!tbody) return;

    tbody.innerHTML = "";

    listaProductosCarrito.forEach((prod, indice) => {
        const fila = document.createElement("tr");

        const tdNombre = crear("td", prod.nombre);
        const tdPrecio = crear("td", formatoPesos(prod.precio));

        const tdAccion = document.createElement("td");
        tdAccion.style.textAlign = "center";

        const btnEditar = crear("button", "✏️", "background: #e7a63c; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;");
        btnEditar.addEventListener("click", () => editarProductoDeTabla(indice));

        const btnEliminar = crear("button", "🗑️", "background: #c1502e; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;");
        btnEliminar.addEventListener("click", () => eliminarProductoDeTabla(indice));

        tdAccion.appendChild(btnEditar);
        tdAccion.appendChild(btnEliminar);

        fila.appendChild(tdNombre);
        fila.appendChild(tdPrecio);
        fila.appendChild(tdAccion);

        tbody.appendChild(fila);
    });
}

function eliminarProductoDeTabla(indice) {
    listaProductosCarrito.splice(indice, 1);

    if (listaProductosCarrito.length === 0) {
        clienteFacturaActual = "";
    }
    renderizarTabla();
}

function editarProductoDeTabla(indice) {
    const prodActual = listaProductosCarrito[indice];
    const nuevoNombre = prompt("Editar nombre del producto:", prodActual.nombre);
    if (nuevoNombre === null) return;

    const nuevoPrecioStr = prompt("Editar precio del producto:", prodActual.precio);
    if (nuevoPrecioStr === null) return;

    const nuevoPrecio = parseFloat(nuevoPrecioStr);

    if (nuevoNombre.trim() !== "" && !isNaN(nuevoPrecio) && nuevoPrecio > 0) {
        listaProductosCarrito[indice].nombre = nuevoNombre.trim();
        listaProductosCarrito[indice].precio = nuevoPrecio;
        renderizarTabla();
    } else {
        alert("Valores no válidos.");
    }
}

/* =========================================================
   HISTORIAL DE VENTAS
   ========================================================= */
function renderizarHistorial() {
    const tbody = document.getElementById("tablaHistorial");
    const vacio = document.getElementById("historialVacio");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (vacio) vacio.style.display = historialFacturas.length === 0 ? "block" : "none";

    historialFacturas.forEach((factura) => {
        const fila = document.createElement("tr");

        fila.appendChild(crear("td", factura.numero));
        fila.appendChild(crear("td", factura.fecha));
        fila.appendChild(crear("td", factura.cliente));
        fila.appendChild(crear("td", formatoPesos(factura.total)));

        const tdAccion = document.createElement("td");
        const btnDetalle = crear("button", "Ver detalle", "background: #e7a63c; color: #1a332b; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 600;");
        btnDetalle.addEventListener("click", () => mostrarDetalleFactura(factura));
        tdAccion.appendChild(btnDetalle);
        fila.appendChild(tdAccion);

        tbody.appendChild(fila);
    });
}

function mostrarDetalleFactura(factura) {
    const contenedor = document.getElementById("detalleFactura");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    contenedor.appendChild(crear("h4", `Factura ${factura.numero}`, "margin-bottom: 0.3rem;"));
    contenedor.appendChild(crear("p", `Cliente: ${factura.cliente}`));
    contenedor.appendChild(crear("p", `Fecha: ${factura.fecha}`, "margin-bottom: 0.5rem;"));

    const tabla = document.createElement("table");
    const thead = document.createElement("thead");
    const filaHead = document.createElement("tr");
    filaHead.appendChild(crear("th", "Producto"));
    filaHead.appendChild(crear("th", "Precio"));
    thead.appendChild(filaHead);
    tabla.appendChild(thead);

    const tbody = document.createElement("tbody");
    factura.productos.forEach((prod) => {
        const fila = document.createElement("tr");
        fila.appendChild(crear("td", prod.nombre));
        fila.appendChild(crear("td", formatoPesos(prod.precio)));
        tbody.appendChild(fila);
    });
    tabla.appendChild(tbody);
    contenedor.appendChild(tabla);

    const resumen = document.createElement("div");
    resumen.style.marginTop = "1rem";

    const items = [
        ["Subtotal:", formatoPesos(factura.subtotal), "factura-item"],
        ["Descuento:", `${factura.porcentajeDesc}%`, "factura-item"],
        ["TOTAL:", formatoPesos(factura.total), "factura-item factura-total"]
    ];

    items.forEach(([etiqueta, valor, clase]) => {
        const div = document.createElement("div");
        div.className = clase;
        div.appendChild(crear("span", etiqueta));
        div.appendChild(crear("strong", valor));
        resumen.appendChild(div);
    });

    contenedor.appendChild(resumen);
}

/* =========================================================
   CONSULTAS Y SOLICITUDES
   ========================================================= */
function registrarConsulta() {
    const nombre = document.getElementById("nuevoNombre").value.trim();
    const email = document.getElementById("nuevoEmail").value.trim();
    const tipo = document.getElementById("nuevoTipo").value;
    const mensaje = document.getElementById("nuevoMensaje").value.trim();

    const errores = {
        errorNuevoNombre: nombre === "" ? "Ingrese el nombre del cliente." : "",
        errorNuevoEmail: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Ingrese un correo válido." : "",
        errorNuevoTipo: tipo === "" ? "Seleccione un tipo de solicitud." : "",
        errorNuevoMensaje: mensaje.length < 10 ? "Escriba al menos 10 caracteres." : ""
    };

    let hayErrores = false;
    Object.keys(errores).forEach((id) => {
        document.getElementById(id).textContent = errores[id];
        if (errores[id] !== "") hayErrores = true;
    });
    if (hayErrores) return;

    listaConsultas.push({
        nombre: nombre,
        email: email,
        tipo: tipo,
        mensaje: mensaje,
        fecha: new Date().toLocaleString("es-CO")
    });
    guardarStorage("consultas", listaConsultas);

    document.getElementById("nuevoFormulario").reset();
    renderizarConsultas();
}

function renderizarConsultas() {
    const contenedor = document.getElementById("listaConsultas");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (listaConsultas.length === 0) {
        contenedor.appendChild(crear("p", "Todavía no se ha registrado ninguna consulta.", "color: #6e7d74;"));
        return;
    }

    // La más reciente primero
    [...listaConsultas].reverse().forEach((c) => {
        const div = document.createElement("div");
        div.className = "consulta-item";

        div.appendChild(crear("strong", `${c.tipo} — ${c.nombre}`, "display: block; color: #24463c;"));
        div.appendChild(crear("small", `${c.email} · ${c.fecha}`, "display: block; color: #6e7d74; margin-bottom: 0.4rem;"));
        div.appendChild(crear("p", c.mensaje));

        contenedor.appendChild(div);
    });
}

/* =========================================================
   IMPRESIÓN Y ENCUADERNACIÓN
   ========================================================= */
const PRECIO_PAGINA = { bn: 100, color: 400 };
const NOMBRE_IMPRESION = { bn: "Blanco y negro", color: "Color" };
const PRECIO_ENCUADERNACION = { ninguna: 0, anillado: 5000, pasta: 15000 };
const NOMBRE_ENCUADERNACION = { ninguna: "sin encuadernación", anillado: "anillado", pasta: "pasta dura" };

function calcularCotizacion() {
    const tipo = document.getElementById("tipoImpresion").value;
    const paginas = parseInt(document.getElementById("numPaginas").value);
    const copias = parseInt(document.getElementById("numCopias").value);
    const encuadernacion = document.getElementById("tipoEncuadernacion").value;
    const error = document.getElementById("errorCotizacion");
    const tarjeta = document.getElementById("resultadoCotizacion");

    if (isNaN(paginas) || paginas < 1 || isNaN(copias) || copias < 1) {
        error.textContent = "Ingrese un número de páginas y copias válido (mínimo 1).";
        tarjeta.style.display = "none";
        ultimaCotizacion = null;
        return;
    }
    error.textContent = "";

    const costoImpresion = paginas * copias * PRECIO_PAGINA[tipo];
    const costoEncuadernacion = copias * PRECIO_ENCUADERNACION[encuadernacion];
    const total = costoImpresion + costoEncuadernacion;

    const descripcion = `Impresión ${NOMBRE_IMPRESION[tipo]} (${paginas} pág. x ${copias} copia${copias > 1 ? "s" : ""}), ${NOMBRE_ENCUADERNACION[encuadernacion]}`;

    document.getElementById("cotDescripcion").textContent = descripcion;
    document.getElementById("cotImpresion").textContent = formatoPesos(costoImpresion);
    document.getElementById("cotEncuadernacion").textContent = formatoPesos(costoEncuadernacion);
    document.getElementById("cotTotal").textContent = formatoPesos(total);
    tarjeta.style.display = "block";

    ultimaCotizacion = { nombre: descripcion, precio: total };
}

function agregarCotizacionAFactura() {
    if (!ultimaCotizacion) return;

    const clienteInput = document.getElementById("cliente");
    const clienteActual = clienteInput ? clienteInput.value.trim() || "Cliente General" : "Cliente General";

    if (validarCambioCliente(clienteActual)) return;

    clienteFacturaActual = clienteActual;
    listaProductosCarrito.push({ nombre: ultimaCotizacion.nombre, precio: ultimaCotizacion.precio });
    renderizarTabla();

    // Llevar al usuario a la pestaña de facturación
    activarVista("vistaVentas");
}

/* =========================================================
   API DE PRODUCTOS (DummyJSON)
   ========================================================= */
async function cargarProductosAPI() {
    const contenedor = document.getElementById("productosAPI");
    if (!contenedor) return;

    contenedor.innerHTML = `<p style="text-align:center; color:#6e7d74;">⏳ Cargando productos desde API...</p>`;

    try {
        const respuesta = await fetch("https://dummyjson.com/products?limit=5");
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);

        const datos = await respuesta.json();
        mostrarProductosAPI(datos.products);
    } catch (error) {
        contenedor.innerHTML = `<p style="text-align:center; color:#c1502e;">❌ No se pudieron cargar los productos.</p>`;
    }
}

function mostrarProductosAPI(productos) {
    const contenedor = document.getElementById("productosAPI");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    productos.forEach((producto) => {
        const div = document.createElement("div");
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-top: 8px; border: 1px solid #e3ddc9; border-radius: 6px; background: #f7f3ea;";

        div.innerHTML = `
            <div>
                <strong style="display:block; color: #24463c;">${producto.title}</strong>
                <span style="color: #6e7d74; font-size: 0.88rem;">Precio: $${producto.price}</span>
            </div>
        `;

        const boton = document.createElement("button");
        boton.textContent = "Agregar";
        boton.style.cssText = "background: #e7a63c; color: #1a332b; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 600;";

        boton.addEventListener("click", () => {
            const clienteInput = document.getElementById("cliente");
            const clienteActual = clienteInput ? clienteInput.value.trim() || "Cliente General" : "Cliente General";

            if (validarCambioCliente(clienteActual)) return;

            clienteFacturaActual = clienteActual;
            listaProductosCarrito.push({
                nombre: producto.title,
                precio: producto.price
            });
            renderizarTabla();
        });

        div.appendChild(boton);
        contenedor.appendChild(div);
    });
}

/* =========================================================
   API DE CLIENTES (JSONPlaceholder)
   ========================================================= */
async function cargarUsuariosAPI() {
    const contenedor = document.getElementById("usuariosAPI");
    if (!contenedor) return;

    contenedor.innerHTML = `<p style="text-align:center; color:#6e7d74;">⏳ Consultando clientes...</p>`;

    try {
        const respuesta = await fetch("https://jsonplaceholder.typicode.com/users");
        if (!respuesta.ok) throw new Error(`Error HTTP: ${respuesta.status}`);

        const usuarios = await respuesta.json();
        mostrarUsuariosAPI(usuarios);
    } catch (error) {
        contenedor.innerHTML = `<p style="text-align:center; color:#c1502e;">❌ Error al consultar clientes.</p>`;
    }
}

function mostrarUsuariosAPI(usuarios) {
    const contenedor = document.getElementById("usuariosAPI");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    usuarios.forEach((usuario) => {
        const div = document.createElement("div");
        div.style.cssText = "padding: 8px; margin-top: 8px; border: 1px solid #e3ddc9; border-radius: 6px; background: #f7f3ea;";

        div.innerHTML = `
            <strong style="display:block; color: #24463c;">👤 ${usuario.name}</strong>
            <small style="color: #6e7d74; display:block;">📧 ${usuario.email}</small>
        `;

        const boton = document.createElement("button");
        boton.textContent = "Seleccionar cliente";
        boton.style.cssText = "display: block; margin-top: 5px; background: #e7a63c; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-weight: 600;";

        boton.addEventListener("click", () => {
            if (validarCambioCliente(usuario.name)) return;

            const inputCliente = document.getElementById("cliente");
            if (inputCliente) {
                inputCliente.value = usuario.name;
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });

        div.appendChild(boton);
        contenedor.appendChild(div);
    });
}