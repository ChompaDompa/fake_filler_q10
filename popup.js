(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fillForm,
  });

  async function fillForm() {
    const response = await fetch(
      "https://randomuser.me/api/?nat=us,gb,ca,au,nz"
    );
    const data = await response.json();
    const user = data.results[0];

    function limpiarTexto(texto) {
      return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z]/g, "");
    }

    function generarNumeroAleatorio(min, max) {
      const longitud = Math.floor(Math.random() * (max - min + 1)) + min;
      let numero = "";
      for (let i = 0; i < longitud; i++) {
        numero += Math.floor(Math.random() * 10);
      }
      return numero;
    }

    function generarFechaAleatoria() {
      const hoy = new Date();
      const anioMin = hoy.getFullYear() - 80;
      const anioMax = hoy.getFullYear() - 10;

      const anio = Math.floor(Math.random() * (anioMax - anioMin + 1)) + anioMin;
      const mes = Math.floor(Math.random() * 12);
      const dia = Math.floor(Math.random() * 28) + 1;

      const fecha = new Date(anio, mes, dia);
      const diaStr = String(fecha.getDate()).padStart(2, "0");
      const mesStr = String(fecha.getMonth() + 1).padStart(2, "0");
      const anioStr = fecha.getFullYear();
      return `${diaStr}/${mesStr}/${anioStr}`;
    }

    const nombreLimpio = limpiarTexto(user.name.first);
    const apellidoLimpio = limpiarTexto(user.name.last);
    const numeroID = generarNumeroAleatorio(8, 12);
    const direccion = `${user.location.street.number} - ${user.location.street.name}`;

    const mappings = {
      // Registrar estudiante
      Persona_per_primer_nombre: nombreLimpio,
      Persona_per_primer_apellido: apellidoLimpio,
      Persona_tipdoc_codigoP: 1,
      Persona_per_numero_identificacion: numeroID,
      Persona_per_genero: 1,
      Persona_per_email: `${nombreLimpio}_${apellidoLimpio}_${numeroID.slice(0, 4)}@yopmail.com`,
      Persona_per_fecha_nacimiento: generarFechaAleatoria(),
      Persona_per_direccion: direccion,
      Persona_per_telefono: numeroID,
      Persona_per_celular: numeroID,
 
      // Preinscripción
      InfoBasica_Persona_per_primer_nombre: nombreLimpio,
      InfoBasica_Persona_per_primer_apellido: apellidoLimpio,
      InfoBasica_Persona_per_genero: 1,
      InfoBasica_Persona_per_email: `${nombreLimpio}_${apellidoLimpio}_${numeroID.slice(0, 4)}@yopmail.com`,
      InfoBasica_Persona_per_fecha_nacimiento: generarFechaAleatoria(),
      InfoBasica_Persona_per_direccion: direccion,

      // Solicitud institucional
      Solicitud_sol_per_nombres_solicitante: nombreLimpio,
      Solicitud_sol_per_apellidos_solicitante: apellidoLimpio,
      Solicitud_sol_pro_codigo: 1,
    };

    // Llenar campos mapeados
    for (let id in mappings) {
      const element =
        document.getElementById(id) || document.querySelector(`[name='${id}']`);
      if (!element) continue;

      if (element.tagName === "SELECT") {
        const index = mappings[id];
        if (element.options.length > index) {
          element.selectedIndex = index;
          element.dispatchEvent(new Event("change"));
        }
      } else {
        element.value = mappings[id];
        element.dispatchEvent(new Event("input"));
        element.dispatchEvent(new Event("change"));
      }
    }

    //Preinscripciones
    const campoIdentificacion = document.getElementById("InfoBasica_Persona_per_numero_identificacion");
    const campoTelefono = document.getElementById("InfoBasica_Persona_per_telefono");
    const campoCelular = document.getElementById("InfoBasica_Persona_per_celular");
    const correoCampo = document.getElementById("InfoBasica_Persona_per_email");

    //Solicitudes institucionales
    const campoIdentificacionSolicitud = document.getElementById("Solicitud_sol_per_identificacion_solicitante");
    const correoCampoSolicitud = document.getElementById("Solicitud_sol_per_email_solicitante");

    if (campoIdentificacion && campoTelefono) {
      campoTelefono.value = campoIdentificacion.value;
      campoTelefono.dispatchEvent(new Event("input"));
      campoTelefono.dispatchEvent(new Event("change"));
    }

    if (campoIdentificacion && campoCelular) {
      campoCelular.value = campoIdentificacion.value;
      campoCelular.dispatchEvent(new Event("input"));
      campoCelular.dispatchEvent(new Event("change"));
    }

    if (campoIdentificacion && correoCampo) {
      const valor = campoIdentificacion.value;
      correoCampo.value = `${nombreLimpio}_${apellidoLimpio}_${valor.slice(0, 4)}@yopmail.com`,
      correoCampo.dispatchEvent(new Event("input"));
      correoCampo.dispatchEvent(new Event("change"));
    }

    if (campoIdentificacionSolicitud && correoCampoSolicitud) {
      const valor = campoIdentificacionSolicitud.value;
      correoCampoSolicitud.value = `${nombreLimpio}_${apellidoLimpio}_${valor.slice(0, 4)}@yopmail.com`,
      correoCampoSolicitud.dispatchEvent(new Event("input"));
      correoCampoSolicitud.dispatchEvent(new Event("change"));
    }
  }
})();