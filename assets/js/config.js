/*
 * One shared connection for the pricing page, order tracker and staff portal.
 * After deploying google-apps-script/Code.gs as a Web App, paste its /exec URL
 * below. Do not edit the individual HTML pages.
 */
window.YASSERS_CONFIG = Object.freeze({
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbywdnBk5gkOhK25OuP51RE6tIu9dseUhz0v3OEdZtp9Yja__rdDcqRiK15to75BLHRX/exec',
  WHATSAPP_NUMBER: '255713438485',
  // Used to display the TSh price estimate in US dollars on the pricing page.
  USD_TO_TZS: 2600,
  BRANCHES: Object.freeze([
    'Nungwi — North Zanzibar (24/7)',
    'Mbweni — Stone Town Area',
    'Taveta — South Region'
  ])
});
