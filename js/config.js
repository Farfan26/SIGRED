/**
 * SIGRED - Configuración central del frontend
 * ===========================================
 * Este archivo es el primer lugar que debes revisar si quieres personalizar
 * el proyecto sin tocar la lógica principal.
 *
 * CAMBIOS RÁPIDOS:
 * 1) API_URL: pega aquí la URL /exec de Google Apps Script cuando la publiques.
 * 2) UDEP_MEDIA: imágenes oficiales utilizadas por el prototipo. Si una URL deja
 *    de funcionar, SIGRED usa automáticamente assets/deportes-udep.jpg.
 * 3) CALENDAR_START_HOUR / CALENDAR_END_HOUR: rango visual del calendario.
 */
window.SIGRED_CONFIG = {
  API_URL: "",
  APP_NAME: "SIGRED",
  INSTITUTION: "Universidad de Piura",
  CAMPUS: "Campus Piura",
  EMAIL_DOMAIN: "udep.edu.pe",
  DEFAULT_SLOT_MINUTES: 60,
  CALENDAR_START_HOUR: 7,
  CALENDAR_END_HOUR: 22,
  REQUEST_TIMEOUT_MS: 12000,

  /**
   * Imágenes públicas de páginas oficiales de la Universidad de Piura.
   * Se mantienen como URL remota para no copiar ni alterar el archivo original.
   * Todas tienen fallback local en caso de no existir conexión a Internet.
   */
  UDEP_MEDIA: {
    campusPiura: "https://www.udep.edu.pe/wp-content/uploads/2020/07/udep_piura-scaled.jpg",
    gobiernoPiura: "https://www.udep.edu.pe/wp-content/uploads/2020/03/Edificio-de-gobierno.png",
    edificioEPiura: "https://www.udep.edu.pe/wp-content/uploads/2020/07/udep_edificioe.jpg",
    futbolCampus: "https://www.udep.edu.pe/dircom/wp-content/uploads/sites/20/2022/08/52163182248_0a6ae7219b_o-1-1024x683.jpg",
    polideportivoExterior: "https://www.udep.edu.pe/vidauniversitaria/wp-content/uploads/sites/3/2024/02/Polideportivo-por-fuera-300x169.jpg",
    polideportivoInterior: "https://www.udep.edu.pe/vidauniversitaria/wp-content/uploads/sites/3/2024/02/Polideportivo-por-dentro-1024x576.jpg"
  }
};
