// src/backend.js
import { DurableObject } from "cloudflare:workers";

// renderer/vendor/routes-data.js
var REDIRECTS = Object.freeze({
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama",
  "https://en.panamalegallab.com/our-services/start-business-in-panama": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/cuenta-bancaria-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama",
  "https://en.panamalegallab.com/our-services/bank-account-in-panama": "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama",
  "https://fr.panamalegallab.com/nos-services/compte-bancaire-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/conto-bancario-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama": "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/sa-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/sa-in-panama": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/sa-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/sa-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/srl-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/srl-in-panama": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/srl-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/srl-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/private-interest-foundation": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/negocios-internacional": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/business-international": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/affaire-international": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/affari-internazionali": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/operativa-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/operating-in-panama": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/operativa-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/crear-empresa-en-panama/operativa-oficina-virtual": "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual",
  "https://en.panamalegallab.com/our-services/start-business-in-panama/virtual-office": "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office",
  "https://fr.panamalegallab.com/nos-services/creer-entreprise-au-panama/bureau-virtuel": "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel",
  "https://it.panamalegallab.com/i-nostri-servizi/creazione-impresa-a-panama/ufficio-virtuale": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale",
  "https://www.panamalegallab.com/nuestros-servicios/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama",
  "https://en.panamalegallab.com/our-services/bank-account-in-panama/personal-bank-account-in-panama": "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama",
  "https://fr.panamalegallab.com/nos-services/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/conto-bancario-a-panama/conto-bancario-personale-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama",
  "https://en.panamalegallab.com/our-services/bank-account-in-panama/corporate-bank-account-in-panama": "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama",
  "https://fr.panamalegallab.com/nos-services/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/conto-bancario-a-panama/conto-bancario-impresa-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/visado-inversionista-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/investor-visa": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/visa-Investisseur-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/visto-investitore": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/visado-profesional-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/professional-visa": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/visa-professionnels-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/professionisti": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/permiso-educativo-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/student-permit": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/permis-etudiant-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/studenti": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/visado-paises-amigos-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/friendly-nations-visa": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/visa-pays-amicaux-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/paesi-amici": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/visado-familiar-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/family-visa": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/visa-familial-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/ricongiungimento-familiare": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/permiso-tecnico-15-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/technical-permit-15": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/permis-technique-15-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/tecnico-15": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/visado-jubilados-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/retiree-visa": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/visa-retraite-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/pensionato": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/sede-multinacionales-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/multinational-headquarters": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/sieges-multinationaux-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/sede-multinazionali": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali",
  "https://www.panamalegallab.com/nuestros-servicios/residencia-en-panama/permiso-extranjero-10-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama",
  "https://en.panamalegallab.com/our-services/residence-in-panama/foreign-worker-10": "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10",
  "https://fr.panamalegallab.com/nos-services/residence-au-panama/permis-etrangers-10-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/residenza-a-panama/straniero-10": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama": "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama": "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama": "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama": "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama": "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama": "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inversiones-en-europa/inmueble-inversi%C3%B3n-llagostera": "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-in-europe/investment-property-llagostera-spain": "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/investissements-europe/bien-investissement-llagostera-espagne": "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/investimenti-europa/immobile-investimento-llagostera-a-spagna": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna",
  "https://www.panamalegallab.com/nuestros-servicios/inversion-inmobiliaria-en-panama/inversiones-en-europa/inmueble-inversi%C3%B3n-canyelles": "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles",
  "https://en.panamalegallab.com/our-services/real-estate-investment-in-panama/investment-in-europe/investment-property-canyelles-spain": "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain",
  "https://fr.panamalegallab.com/nos-services/investissement-immobilier-au-panama/investissements-europe/bien-investissement-canyelles-spagne": "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne",
  "https://it.panamalegallab.com/i-nostri-servizi/investimento-immobiliare-a-panama/investimenti-europa/immobile-investimento-canyelles-a-panama": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama",
  "https://www.panamalegallab.com/espana": "https://www.panamalegallab.com/nuestros-servicios-en-espana",
  "https://en.panamalegallab.com/spain": "https://en.panamalegallab.com/our-services-in-spain",
  "https://fr.panamalegallab.com/espagne": "https://fr.panamalegallab.com/nos-Services-au-espagne",
  "https://it.panamalegallab.com/spagna": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna",
  "https://www.panamalegallab.com/espana/establecimiento-inversion": "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana",
  "https://en.panamalegallab.com/spain/establishment-investment": "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain",
  "https://fr.panamalegallab.com/espagne/etablissement-investissement": "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne",
  "https://it.panamalegallab.com/spagna/insediamento-investimento": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento",
  "https://www.panamalegallab.com/espana/lmd-expedientes-iniciados": "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana",
  "https://en.panamalegallab.com/spain/lmd-existing-cases": "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain",
  "https://fr.panamalegallab.com/espagne/lmd-dossiers-engages": "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne",
  "https://it.panamalegallab.com/spagna/lmd-pratiche-avviate": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate",
  "https://www.panamalegallab.com/espana/nacionalidad/opcion-familia": "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana",
  "https://en.panamalegallab.com/spain/nationality/family-option": "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain",
  "https://fr.panamalegallab.com/espagne/nationalite/option-famille": "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne",
  "https://it.panamalegallab.com/spagna/cittadinanza/opzione-famiglia": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia",
  "https://www.panamalegallab.com/espana/origen-espanol": "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol",
  "https://en.panamalegallab.com/spain/spanish-ancestry": "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research",
  "https://fr.panamalegallab.com/espagne/origine-espagnole": "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles",
  "https://it.panamalegallab.com/spagna/origine-spagnola": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole",
  "https://www.panamalegallab.com/espana/partidas-certificados": "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana",
  "https://en.panamalegallab.com/spain/records-certificates": "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain",
  "https://fr.panamalegallab.com/espagne/actes-certificats": "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne",
  "https://it.panamalegallab.com/spagna/atti-certificati": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna",
  "https://www.panamalegallab.com/espana/residencia": "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana",
  "https://en.panamalegallab.com/spain/residence": "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain",
  "https://fr.panamalegallab.com/espagne/residence": "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne",
  "https://it.panamalegallab.com/spagna/residenza": "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna",
  "https://www.panamalegallab.com/guia-de-recursos/nacionalidad-residencia": "https://www.panamalegallab.com/guia-de-recursos/guia-nacionalidad-espanola-por-residencia",
  "https://en.panamalegallab.com/resource-hub/nationality-residence": "https://en.panamalegallab.com/resource-hub/guide-citizenship-by-residence-spain",
  "https://fr.panamalegallab.com/guide-de-ressources/nationalite-residence": "https://fr.panamalegallab.com/guide-de-ressources/guide-nationalite-par-residence-espagne",
  "https://it.panamalegallab.com/guida-risorse/cittadinanza-residenza": "https://it.panamalegallab.com/guida-risorse/guida-cittadinanza-per-residenza-spagna",
  "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados": "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados-espana",
  "https://en.panamalegallab.com/resource-hub/certificate-types": "https://en.panamalegallab.com/resource-hub/types-of-certificates-spain",
  "https://fr.panamalegallab.com/guide-de-ressources/types-certificats": "https://fr.panamalegallab.com/guide-de-ressources/types-de-certificats-espagne",
  "https://it.panamalegallab.com/guida-risorse/tipi-certificati": "https://it.panamalegallab.com/guida-risorse/tipi-di-certificati-spagna",
  "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inversiones-en-espa%C3%B1a": "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles"
});
var KNOWN_PATHS = Object.freeze(Object.fromEntries(Object.entries({
  "es": [
    "/",
    "/aviso-legal-politica-privacidad",
    "/contacto",
    "/guia-de-recursos",
    "/inicio",
    "/nuestros-servicios-en-espana",
    "/nuestros-servicios-en-espana/investigacion-origen-espanol",
    "/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia",
    "/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana",
    "/nuestros-servicios-en-espana/residencia-en-espana",
    "/nuestros-servicios-en-panama",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama",
    "/nuestros-servicios-en-panama/cuenta-bancaria-en-panama",
    "/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama",
    "/sobre-nosotros",
    "/guia-de-recursos/accionistas-directores-y-capital",
    "/guia-de-recursos/como-buscar-partida-abuelo-espanol-sin-conocer-municipio",
    "/guia-de-recursos/fundaciones-y-fideicomisos",
    "/guia-de-recursos/guia-nacionalidad-espanola-por-residencia",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1",
    "/guia-de-recursos/tipos-certificados-espana",
    "/nuestros-servicios-en-espana/establecimiento-e-inversion-espana",
    "/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana",
    "/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama",
    "/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama",
    "/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama",
    "/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama",
    "/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama",
    "/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama",
    "/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama",
    "/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama",
    "/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama",
    "/guia-de-recursos/accionistas-directores-y-capital/capital-social-sociedad-an%C3%B3nima-paname%C3%B1a",
    "/guia-de-recursos/accionistas-directores-y-capital/comparativa-acciones-nominativas-frente-a-las-acciones-al-portador",
    "/guia-de-recursos/accionistas-directores-y-capital/debo-escoger-el-servicio-de-directores-nominales-al-crear-una-s-a",
    "/guia-de-recursos/accionistas-directores-y-capital/diferencias-accionistas-y-directores-en-las-sociedades-an%C3%B3nimas-de-panam%C3%A1",
    "/guia-de-recursos/accionistas-directores-y-capital/directores-nominales-procedimiento-para-uso-del-documento-de-renuncia",
    "/guia-de-recursos/fundaciones-y-fideicomisos/comparativa-sociedades-an%C3%B3nimas-vs-fundaciones-inter%C3%A9s-privado",
    "/guia-de-recursos/fundaciones-y-fideicomisos/distinciones-legales-fundaciones-de-inter%C3%A9s-privado-vs-fideicomisos",
    "/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9n-administra-las-fundaciones-de-inter%C3%A9s-privado-y-c%C3%B3mo-se-manejan",
    "/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9nes-pueden-ser-beneficiarios-de-una-fundaci%C3%B3n-de-inter%C3%A9s-privado",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/atractivo-del-registro",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-a-vs-s-r-l-en-panam%C3%A1",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-r-l-y-otras-figuras-jur%C3%ADdicas",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedad-extranjera-s-a-y-redomiciliaci%C3%B3n",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedades-an%C3%B3nimas-operativas-y-no-operativas",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/requisitos-para-el-registro-de-una-sociedad-en-panam%C3%A1",
    "/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/tipos-de-sociedades-opciones-para-ejercer-actividades-comerciales",
    "/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles",
    "/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera"
  ],
  "en": [
    "/",
    "/about-us",
    "/contact-us",
    "/home",
    "/legal-notice-privacy-policy",
    "/our-services-in-panama",
    "/our-services-in-panama/bank-account-in-panama",
    "/our-services-in-panama/real-estate-investment-in-panama",
    "/our-services-in-panama/residence-in-panama",
    "/our-services-in-panama/start-business-in-panama",
    "/our-services-in-spain",
    "/our-services-in-spain/obtaining-records-and-certificates-in-spain",
    "/our-services-in-spain/residency-in-spain",
    "/our-services-in-spain/spanish-ancestry-research",
    "/our-services-in-spain/spanish-citizenship-by-residence",
    "/resource-hub",
    "/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama",
    "/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama",
    "/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama",
    "/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama",
    "/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama",
    "/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama",
    "/our-services-in-spain/business-setup-investment-spain",
    "/our-services-in-panama/residence-in-panama/family-visa",
    "/our-services-in-panama/residence-in-panama/foreign-worker-10",
    "/our-services-in-panama/residence-in-panama/friendly-nations-visa",
    "/our-services-in-panama/residence-in-panama/investor-visa",
    "/our-services-in-panama/residence-in-panama/multinational-headquarters",
    "/our-services-in-panama/residence-in-panama/professional-visa",
    "/our-services-in-panama/residence-in-panama/retiree-visa",
    "/our-services-in-panama/residence-in-panama/student-permit",
    "/our-services-in-panama/residence-in-panama/technical-permit-15",
    "/our-services-in-panama/start-business-in-panama/business-international",
    "/our-services-in-panama/start-business-in-panama/operating-in-panama",
    "/our-services-in-panama/start-business-in-panama/private-interest-foundation",
    "/our-services-in-panama/start-business-in-panama/sa-in-panama",
    "/our-services-in-panama/start-business-in-panama/srl-in-panama",
    "/our-services-in-panama/start-business-in-panama/virtual-office",
    "/our-services-in-spain/nationality-by-option-family-routes-spain",
    "/our-services-in-spain/ongoing-lmd-applications-spain",
    "/resource-hub/for-your-foundations-and-trusts",
    "/resource-hub/guide-citizenship-by-residence-spain",
    "/resource-hub/how-to-find-spanish-grandfathers-birth-record-without-knowing-municipality",
    "/resource-hub/registration-and-types-of-companies",
    "/resource-hub/shareholders-directors-and-capital",
    "/resource-hub/types-of-certificates-spain",
    "/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain",
    "/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain",
    "/resource-hub/for-your-foundations-and-trusts/comparative-corporations-vs-private-interest-foundations",
    "/resource-hub/for-your-foundations-and-trusts/legal-distinctions-private-interest-foundations-vs-trusts",
    "/resource-hub/for-your-foundations-and-trusts/who-administers-private-interest-foundations-and-how-are-they-managed",
    "/resource-hub/for-your-foundations-and-trusts/who-can-be-beneficiaries-of-a-private-interest-foundation",
    "/resource-hub/registration-and-types-of-companies/comparative-foreign-company-s-a-and-redomiciliation",
    "/resource-hub/registration-and-types-of-companies/comparative-operating-and-non-operating-anonymous-corporation",
    "/resource-hub/registration-and-types-of-companies/comparative-s-a-vs-s-r-l-in-panam%C3%A1",
    "/resource-hub/registration-and-types-of-companies/comparative-s-r-l-and-other-legal-entities",
    "/resource-hub/registration-and-types-of-companies/requirements-for-registering-a-company-in-panama",
    "/resource-hub/registration-and-types-of-companies/the-appeal-of-registering-a-company-in-panama",
    "/resource-hub/registration-and-types-of-companies/types-of-companies-for-conducting-commercial-activities",
    "/resource-hub/shareholders-directors-and-capital/comparative-registered-shares-vs-bearer-shares",
    "/resource-hub/shareholders-directors-and-capital/differences-shareholders-and-directors-in-anonymous-corporation-in-pana",
    "/resource-hub/shareholders-directors-and-capital/nominee-directors-procedure-for-the-use-of-the-resignation-letter",
    "/resource-hub/shareholders-directors-and-capital/share-capital-panamanian-anonymous-corporation",
    "/resource-hub/shareholders-directors-and-capital/should-i-choose-the-nominee-directors-service-when-incorporating-a-s-a"
  ],
  "fr": [
    "/",
    "/a-propos",
    "/accueil",
    "/contactez-nous",
    "/guide-de-ressources",
    "/mentions-legales-politique-confidentialite",
    "/nos-Services-au-espagne",
    "/nos-Services-au-espagne/nationalite-espagnole-par-residence",
    "/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne",
    "/nos-Services-au-espagne/recherche-origines-espagnoles",
    "/nos-Services-au-espagne/residence-en-espagne",
    "/nos-services-au-panama",
    "/nos-services-au-panama/compte-bancaire-au-panama",
    "/nos-services-au-panama/creer-entreprise-au-panama",
    "/nos-services-au-panama/investissement-immobilier-au-panama",
    "/nos-services-au-panama/residence-au-panama",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital",
    "/guide-de-ressources/comment-retrouver-acte-naissance-grand-pere-espagnol-sans-connaitre-commune",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s",
    "/guide-de-ressources/guide-nationalite-par-residence-espagne",
    "/guide-de-ressources/pour-vos-fondations-et-fiducies",
    "/guide-de-ressources/types-de-certificats-espagne",
    "/nos-Services-au-espagne/creation-activite-investissement-espagne",
    "/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne",
    "/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne",
    "/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama",
    "/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama",
    "/nos-services-au-panama/creer-entreprise-au-panama/affaire-international",
    "/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel",
    "/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama",
    "/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama",
    "/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama",
    "/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama",
    "/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama",
    "/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama",
    "/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama",
    "/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama",
    "/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama",
    "/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama",
    "/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama",
    "/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama",
    "/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama",
    "/nos-services-au-panama/residence-au-panama/visa-familial-au-panama",
    "/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama",
    "/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama",
    "/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital/capital-social-soci%C3%A9t%C3%A9-anonyme-panam%C3%A9enne",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital/comparatif-actions-nominatives-vs-actions-au-porteur",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital/diff%C3%A9rences-actionnaires-et-administrateurs-dans-les-soci%C3%A9t%C3%A9s-anonymes",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital/directeurs-nominaux-proc%C3%A9dure-dutilisation-du-document-de-d%C3%A9mission",
    "/guide-de-ressources/actionnaires-administrateurs-et-capital/dois-je-choisir-le-service-de-directeurs-nominaux-lors-de-la-cr%C3%A9ation-s-a",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-a-vs-s-r-l-au-panam%C3%A1",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-r-l-et-autres-formes-juridiques",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-soci%C3%A9t%C3%A9-%C3%A9trang%C3%A8re-s-a-et-redomiciliation",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparative-operating-and-non-operating-public-limited-companies",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/exigences-pour-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/lattrait-de-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama",
    "/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/types-de-soci%C3%A9t%C3%A9s-options-pour-exercer-des-activit%C3%A9s-commerciales",
    "/guide-de-ressources/pour-vos-fondations-et-fiducies/comparatif-soci%C3%A9t%C3%A9s-anonymes-vs-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9",
    "/guide-de-ressources/pour-vos-fondations-et-fiducies/distinctions-juridiques-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-vs-fiducies",
    "/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-administre-les-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-et-comment-sont-elles-g%C3%A9r%C3%A9es",
    "/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-peut-%C3%AAtre-b%C3%A9n%C3%A9ficiaire-dune-fondation-dint%C3%A9r%C3%AAt-priv%C3%A9",
    "/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne",
    "/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne"
  ],
  "it": [
    "/",
    "/chi-siamo",
    "/contatto",
    "/guida-risorse",
    "/i-nostri-servizi-a-panama",
    "/i-nostri-servizi-a-panama/conto-bancario-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama",
    "/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama",
    "/i-nostri-servizi-a-panama/residenza-a-panama",
    "/i-nostri-servizi-a-spagna",
    "/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza",
    "/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna",
    "/i-nostri-servizi-a-spagna/residenza-in-spagna",
    "/i-nostri-servizi-a-spagna/ricerca-origini-spagnole",
    "/inizio",
    "/note-legali-informativa-privacy",
    "/guida-risorse/azionisti-direttori-e-capitale",
    "/guida-risorse/come-trovare-atto-nascita-nonno-spagnolo-senza-conoscere-comune",
    "/guida-risorse/fondazioni-e-trust",
    "/guida-risorse/guida-cittadinanza-per-residenza-spagna",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama",
    "/guida-risorse/tipi-di-certificati-spagna",
    "/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama",
    "/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama",
    "/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale",
    "/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama",
    "/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama",
    "/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama",
    "/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama",
    "/i-nostri-servizi-a-spagna/insediamento-investimento",
    "/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici",
    "/i-nostri-servizi-a-panama/residenza-a-panama/pensionato",
    "/i-nostri-servizi-a-panama/residenza-a-panama/professionisti",
    "/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare",
    "/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali",
    "/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10",
    "/i-nostri-servizi-a-panama/residenza-a-panama/studenti",
    "/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15",
    "/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore",
    "/i-nostri-servizi-a-spagna/lmd-pratiche-avviate",
    "/i-nostri-servizi-a-spagna/opzione-famiglia",
    "/guida-risorse/azionisti-direttori-e-capitale/capitale-sociale-societ%C3%A0-anonima-panamense",
    "/guida-risorse/azionisti-direttori-e-capitale/confronto-azioni-nominative-vs-azioni-al-portatore",
    "/guida-risorse/azionisti-direttori-e-capitale/devo-scegliere-il-servizio-di-direttori-nominali-nella-creazione-di-una-s-a",
    "/guida-risorse/azionisti-direttori-e-capitale/differenze-azionisti-e-direttori-nelle-societ%C3%A0-anonime-di-panama",
    "/guida-risorse/azionisti-direttori-e-capitale/direttori-nominali-procedura-per-luso-del-documento-di-dimissioni",
    "/guida-risorse/fondazioni-e-trust/chi-amministra-le-fondazioni-di-interesse-privato-e-come-vengono-gestite",
    "/guida-risorse/fondazioni-e-trust/chi-pu%C3%B2-essere-beneficiario-di-una-fondazione-di-interesse-privato",
    "/guida-risorse/fondazioni-e-trust/confronto-societ%C3%A0-anonime-vs-fondazioni-di-interesse-privato",
    "/guida-risorse/fondazioni-e-trust/distinzioni-giuridiche-fondazioni-di-interesse-privato-vs-trust",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-a-vs-s-r-l-a-panama",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-r-l-e-altre-figure-giuridiche",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-anonime-operative-e-non-operative",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-straniera-s-a-e-redomiciliazione",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/il-fascino-della-registrazione-delle-societ%C3%A0-a-panama",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/requisiti-per-la-registrazione-di-una-societ%C3%A0-a-panama",
    "/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/tipi-di-societ%C3%A0-opzioni-per-svolgere-attivit%C3%A0-commerciali",
    "/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama",
    "/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna"
  ]
}).map(([key, paths]) => [key, Object.freeze(paths)])));

// renderer/vendor/logic.js
var SITES = Object.freeze(Object.fromEntries([
  ["es", "panamalegallab", "www"],
  ["en", "panamlegallab-en", "en"],
  ["fr", "panamlegallab-fr", "fr"],
  ["it", "panamlegallab-it", "it"]
].map(([language, slug, host]) => [language, Object.freeze({
  language,
  upstreamRoot: `https://sites.google.com/panamalegallab.com/${slug}`,
  upstreamPrefix: `/panamalegallab.com/${slug}`,
  productionHost: `${host}.panamalegallab.com`,
  productionOrigin: `https://${host}.panamalegallab.com`
})])));
var normalizePath = (path) => path.replace(/%[0-9a-f]{2}/gi, (code) => code.toUpperCase());
function rewriteImageReferences(value) {
  if (!value) return value;
  return value.replaceAll(
    "https://sites.google.com/sitesv-images-rt/",
    "https://lh7-us.googleusercontent.com/sitesv-images-rt/"
  );
}
function rewriteKnownImagePreloader(text) {
  const source = String.raw`https:\/\/sites.google.com\/sitesv-images-rt\/`;
  const cdn = String.raw`https:\/\/lh7-us.googleusercontent.com\/sitesv-images-rt\/`;
  if (!text.trimStart().startsWith("const imageUrl = '" + source) || !text.includes("function bgImgLoaded()") || !text.includes("globals.headerBgImgLoaded")) return text;
  return text.replace(source, cdn);
}
function unsafePath(input) {
  const rawPath = input.match(/^https?:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? "";
  if (/[\\\u0000-\u001f\u007f]/.test(rawPath) || /%(?:2f|5c|2e|25)/i.test(rawPath)) return true;
  if (rawPath.split("/").some((part) => part === "." || part === "..")) return true;
  try {
    decodeURIComponent(rawPath);
    return false;
  } catch {
    return true;
  }
}
function planRequest(input) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return { kind: "error", status: 400 };
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const preview = [".workers.dev", ".pages.dev"].some((suffix) => url.hostname.endsWith(suffix));
  if (!(preview || local)) return { kind: "forbidden-host", status: 421 };
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || unsafePath(input)) {
    return { kind: "error", status: 400 };
  }
  if (!local && url.protocol !== "https:") return { kind: "error", status: 400 };
  if (url.pathname === "/") return { kind: "index" };
  if (url.pathname === "/robots.txt") return { kind: "robots" };
  const match = url.pathname.match(/^\/(es|en|fr|it)(\/.*)?$/);
  if (!match) return { kind: "error", status: 404 };
  const site = SITES[match[1]];
  const path = normalizePath(match[2] ?? "/");
  const target = REDIRECTS[`${site.productionOrigin}${path}`];
  if (target) return { kind: "redirect", status: 301, location: `${target}${url.search}` };
  if (!KNOWN_PATHS[site.language].includes(path)) return { kind: "error", status: 404 };
  return {
    kind: "page",
    site,
    path,
    upstream: `${site.upstreamRoot}${path}${url.search}`,
    canonical: `${site.productionOrigin}${path}`,
    previewPage: `${url.origin}/${site.language}${path}${url.search}`,
    previewOrigin: url.origin
  };
}
function approvedPreviewPath(parsed) {
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.port || parsed.username || parsed.password) return null;
  const site = Object.values(SITES).find((candidate) => {
    if (parsed.hostname === candidate.productionHost) return true;
    return parsed.origin === "https://sites.google.com" && (parsed.pathname === candidate.upstreamPrefix || parsed.pathname.startsWith(`${candidate.upstreamPrefix}/`));
  });
  if (!site) return null;
  const prefix = parsed.hostname === site.productionHost ? "" : site.upstreamPrefix;
  const path = parsed.pathname.slice(prefix.length) || "/";
  return `/${site.language}${path}${parsed.search}${parsed.hash}`;
}
function rewriteSiteUrl(value, previewOrigin) {
  if (!value || value.startsWith("#")) return value;
  let parsed;
  try {
    parsed = new URL(value, "https://sites.google.com");
  } catch {
    return value;
  }
  const direct = approvedPreviewPath(parsed);
  if (direct) return direct;
  if (parsed.origin !== "https://www.google.com" || parsed.pathname !== "/url" || parsed.username || parsed.password) return value;
  const targets = parsed.searchParams.getAll("q");
  if (targets.length !== 1) return value;
  try {
    return approvedPreviewPath(new URL(targets[0])) ?? value;
  } catch {
    return value;
  }
}
function rewriteBootstrapConfig(text, upstreamPage, previewPage) {
  if (!text.trimStart().startsWith("_at_config =")) return text;
  const replacement = JSON.stringify(previewPage).replaceAll("<", "\\u003c");
  return text.replace(/"(?:\\.|[^"\\])*"/g, (token) => {
    try {
      return JSON.parse(token) === upstreamPage ? replacement : token;
    } catch {
      return token;
    }
  });
}
var PreviewCompatibilityError = class extends Error {
  constructor(message = "Unsupported Google Sites configuration.") {
    super(message);
    this.name = "PreviewCompatibilityError";
  }
};
function arrayElementSpan(json, wantedIndex) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  let index = 0;
  let start = 1;
  for (let offset = 0; offset < json.length; offset += 1) {
    const char = json[offset];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "[" || char === "{") {
      depth += 1;
      continue;
    }
    if (char === "]" || char === "}") {
      if (depth === 1 && index === wantedIndex) return { start, end: offset };
      depth -= 1;
      continue;
    }
    if (char === "," && depth === 1) {
      if (index === wantedIndex) return { start, end: offset };
      index += 1;
      start = offset + 1;
    }
  }
  throw new PreviewCompatibilityError();
}
function leadingArrayEnd(source) {
  if (source[0] !== "[") throw new PreviewCompatibilityError();
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let offset = 0; offset < source.length; offset += 1) {
    const char = source[offset];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "[" || char === "{") depth += 1;
    if (char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) return offset + 1;
    }
  }
  throw new PreviewCompatibilityError();
}
function clearGoogleRedirectConfig(text, upstreamPage) {
  if (!/^\s*_at_config\s*=/.test(text)) return text;
  const assignment = /^(\s*_at_config\s*=\s*)/.exec(text);
  if (!assignment) throw new PreviewCompatibilityError();
  const remainder = text.slice(assignment[1].length);
  const end = leadingArrayEnd(remainder);
  const json = remainder.slice(0, end);
  const suffix = remainder.slice(end);
  if (!/^\s*;/.test(suffix) || /\b_at_config\s*=/.test(suffix)) throw new PreviewCompatibilityError();
  let config;
  try {
    config = JSON.parse(json);
  } catch {
    throw new PreviewCompatibilityError();
  }
  if (!Array.isArray(config) || config.length !== 518 || config[212] !== 0 || config[316] !== upstreamPage) {
    throw new PreviewCompatibilityError();
  }
  const span = arrayElementSpan(json, 316);
  const token = json.slice(span.start, span.end);
  const leading = token.match(/^\s*/)[0];
  const trailing = token.match(/\s*$/)[0];
  return assignment[1] + json.slice(0, span.start) + leading + "null" + trailing + json.slice(span.end) + suffix;
}
function createQuota(limit = 600, duration = 6e4) {
  let state = Object.freeze({ window: -1, count: 0 });
  return (now) => {
    const window = Math.floor(now / duration);
    const count = state.window === window ? state.count + 1 : 1;
    state = Object.freeze({ window, count });
    return count <= limit;
  };
}

// renderer/src/search-protocol.js
var SEARCH_BODY_LIMIT = 4096;
var SEARCH_RESPONSE_LIMIT = 262144;
var XSSI = ")]}'\n\n";
var headers = Object.freeze({ "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
var SearchInputError = class extends Error {
  constructor(status = 400) {
    super("Invalid public search request.");
    this.status = status;
  }
};
function searchError(status) {
  return new Response(
    status >= 500 ? "Public search is temporarily unavailable." : "Invalid public search request.",
    { status, headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", ...status === 429 ? { "Retry-After": "60" } : {} } }
  );
}
function formPairs(raw) {
  if (!raw) return [];
  try {
    return raw.split("&").map((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) throw new SearchInputError();
      return [part.slice(0, separator), part.slice(separator + 1)].map((value) => decodeURIComponent(value.replaceAll("+", " ")));
    });
  } catch {
    throw new SearchInputError();
  }
}
function queryValue(query) {
  if (typeof query !== "string" || /[\u0000-\u001f\u007f-\u009f]/u.test(query)) throw new SearchInputError();
  const points = Array.from(query);
  if (points.length > 256 || points.some((point) => point.length === 1 && /[\ud800-\udfff]/.test(point))) throw new SearchInputError();
  return query;
}
function cursorValue(value) {
  const cursor = queryValue(value);
  if (!cursor.length) throw new SearchInputError();
  return cursor;
}
function isSameOriginSearch(request) {
  const expected = new URL(request.url).origin;
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("Origin");
  if (origin !== null) return origin === expected;
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try {
    const url = new URL(referer);
    return url.origin === expected && !url.username && !url.password;
  } catch {
    return false;
  }
}
async function readBoundedText(stream, limit, lengthHeader) {
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > limit) throw new SearchInputError(413);
  if (!stream) return "";
  const reader = stream.getReader();
  let chunks = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new SearchInputError(413);
    }
    chunks = [...chunks, item.value];
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SearchInputError();
  }
}
function validatedSearchMessage(text) {
  if (new TextEncoder().encode(text).byteLength > SEARCH_BODY_LIMIT) throw new SearchInputError(413);
  const pairs = formPairs(text);
  if (pairs.length !== 1 || pairs[0][0] !== "f.req") throw new SearchInputError();
  let parsed;
  try {
    parsed = JSON.parse(pairs[0][1]);
  } catch {
    throw new SearchInputError();
  }
  if (!Array.isArray(parsed) || ![2, 4].includes(parsed.length) || parsed[0] !== "at:ss:req") throw new SearchInputError();
  const query = queryValue(parsed[1]);
  if (parsed.length === 2) return Object.freeze(["at:ss:req", query]);
  if (parsed[2] !== null) throw new SearchInputError();
  const cursor = cursorValue(parsed[3]);
  return Object.freeze(["at:ss:req", query, null, cursor]);
}
function nestedArraySpan(json, path) {
  let start = 0;
  let current = json;
  let span;
  for (const index of path) {
    span = arrayElementSpan(current, index);
    const raw = current.slice(span.start, span.end);
    const leading = raw.match(/^\s*/)[0].length;
    start += span.start + leading;
    current = raw.trim();
  }
  return { start, end: start + current.length };
}
function rewriteSearchResponse(text, previewOrigin, rewriteUrl = rewriteSiteUrl) {
  if (!text.startsWith(XSSI)) throw new SearchInputError(502);
  const framed = text.slice(XSSI.length);
  const leading = framed.match(/^[ \t\r\n]*/)[0];
  const trailing = framed.match(/[ \t\r\n]*$/)[0];
  const json = framed.slice(leading.length, trailing.length ? -trailing.length : void 0);
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SearchInputError(502);
  }
  if (!Array.isArray(data) || data.length !== 1 || !Array.isArray(data[0]) || data[0].length !== 15 || data[0][0] !== "at:ss:res" || data[0][1] !== null && !Array.isArray(data[0][1]) || Array.isArray(data[0][1]) && data[0][1].length > 10) throw new SearchInputError(502);
  const patches = (data[0][1] ?? []).map((row, index) => {
    if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== "string" || !Array.isArray(row[1]) || !Array.isArray(row[2]) || typeof row[3] !== "string") throw new SearchInputError(502);
    const rewritten2 = /[\s<>]/u.test(row[0]) ? row[0] : rewriteUrl(row[0], previewOrigin);
    if (rewritten2 === row[0]) return null;
    const span = nestedArraySpan(json, [0, 1, index, 0]);
    return { ...span, value: JSON.stringify(rewritten2).replaceAll("<", "\\u003c") };
  }).filter(Boolean);
  const rewritten = patches.reduceRight((value, patch) => value.slice(0, patch.start) + patch.value + value.slice(patch.end), json);
  return XSSI + leading + rewritten + trailing;
}
async function relaySearchPost(request, plan, { fetchImpl, quota, now, rewriteUrl = rewriteSiteUrl }) {
  if (!isSameOriginSearch(request)) return searchError(403);
  const type = request.headers.get("Content-Type") ?? "";
  if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset\s*=\s*UTF-8)?\s*$/i.test(type) || request.headers.has("Content-Encoding")) return searchError(415);
  if (!quota(now())) return searchError(429);
  let encodedBody;
  try {
    const message = validatedSearchMessage(await readBoundedText(request.body, SEARCH_BODY_LIMIT, request.headers.get("Content-Length")));
    encodedBody = new URLSearchParams({ "f.req": JSON.stringify(message) }).toString();
    if (new TextEncoder().encode(encodedBody).byteLength > SEARCH_BODY_LIMIT) throw new SearchInputError(413);
  } catch (error2) {
    return searchError(error2 instanceof SearchInputError ? error2.status : 400);
  }
  try {
    const upstream = await fetchImpl(plan.upstream, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
        "Accept-Language": plan.site.language,
        "User-Agent": "PLL-Isolated-SEO-Preview/1.0"
      },
      body: encodedBody,
      signal: AbortSignal.timeout(1e4)
    });
    if (upstream.status !== 200 || !/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(upstream.headers.get("Content-Type") ?? "")) return searchError(502);
    const text = await readBoundedText(upstream.body, SEARCH_RESPONSE_LIMIT, upstream.headers.get("Content-Length"));
    const rewritten = rewriteSearchResponse(text, new URL(request.url).origin, rewriteUrl);
    return new Response(rewritten, { status: 200, headers: { ...headers, "Content-Type": upstream.headers.get("Content-Type") } });
  } catch {
    return searchError(502);
  }
}

// renderer/src/page-reader.js
function decode(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SearchInputError();
  }
}
function nativeReader(stream) {
  let reader;
  try {
    reader = stream.getReader({ mode: "byob" });
  } catch (error2) {
    if (!(error2 instanceof TypeError)) throw error2;
    return null;
  }
  if (typeof reader.readAtLeast === "function") return reader;
  reader.releaseLock();
  return null;
}
async function readNative(reader, limit) {
  const result = await reader.readAtLeast(limit + 1, new Uint8Array(limit + 1));
  const bytes = result.value ?? new Uint8Array();
  if (bytes.byteLength > limit) {
    await reader.cancel();
    throw new SearchInputError(413);
  }
  return decode(bytes);
}
async function readGeneric(reader, limit) {
  const bytes = new Uint8Array(limit);
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    const nextSize = size + item.value.byteLength;
    if (nextSize > limit) {
      await reader.cancel();
      throw new SearchInputError(413);
    }
    bytes.set(item.value, size);
    size = nextSize;
  }
  return decode(bytes.subarray(0, size));
}
async function readBoundedPageText(stream, limit, lengthHeader) {
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > limit) throw new SearchInputError(413);
  if (!stream) return "";
  const reader = nativeReader(stream);
  return reader ? readNative(reader, limit) : readGeneric(stream.getReader(), limit);
}

// renderer/vendor/search.js
var SEARCH_BODY_LIMIT2 = 4096;
var SEARCH_RESPONSE_LIMIT2 = 262144;
var SEARCH_HTML_LIMIT = 1048576;
var XSSI2 = ")]}'\n\n";
var headers2 = Object.freeze({ "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
var SearchInputError2 = class extends Error {
  constructor(status = 400) {
    super("Invalid public search request.");
    this.status = status;
  }
};
function searchError2(status) {
  return new Response(
    status >= 500 ? "Public search is temporarily unavailable." : "Invalid public search request.",
    { status, headers: { ...headers2, "Content-Type": "text/plain; charset=utf-8", ...status === 429 ? { "Retry-After": "60" } : {} } }
  );
}
function formPairs2(raw) {
  if (!raw) return [];
  try {
    return raw.split("&").map((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) throw new SearchInputError2();
      return [part.slice(0, separator), part.slice(separator + 1)].map((value) => decodeURIComponent(value.replaceAll("+", " ")));
    });
  } catch {
    throw new SearchInputError2();
  }
}
function queryValue2(query) {
  if (typeof query !== "string" || /[\u0000-\u001f\u007f-\u009f]/u.test(query)) throw new SearchInputError2();
  const points = Array.from(query);
  if (points.length > 256 || points.some((point) => point.length === 1 && /[\ud800-\udfff]/.test(point))) throw new SearchInputError2();
  return query;
}
function cursorValue2(value) {
  const cursor = queryValue2(value);
  if (!cursor.length) throw new SearchInputError2();
  return cursor;
}
function searchParameters(raw, isPage) {
  const pairs = formPairs2(raw);
  const keys = pairs.map(([key]) => key);
  if (new Set(keys).size !== keys.length) throw new SearchInputError2();
  const parameters = Object.fromEntries(pairs);
  const allowed = isPage ? ["query", "scope", "showCloudSearchTab", "authuser", "page_token"] : ["authuser"];
  if (keys.some((key) => !allowed.includes(key)) || "authuser" in parameters && parameters.authuser !== "0") throw new SearchInputError2();
  if (!isPage) return "";
  if (!("query" in parameters) || parameters.scope !== "site" || parameters.showCloudSearchTab !== "false") throw new SearchInputError2();
  return new URLSearchParams({
    query: queryValue2(parameters.query),
    scope: "site",
    showCloudSearchTab: "false",
    ..."page_token" in parameters ? { page_token: cursorValue2(parameters.page_token) } : {}
  }).toString();
}
function planSearchRequest(input, method) {
  const url = new URL(input);
  const site = Object.values(SITES).find((candidate) => url.pathname === `/_/view/search${candidate.upstreamPrefix}` || url.pathname === `/search${candidate.upstreamPrefix}`);
  if (!site) return null;
  if (method === "POST" && url.pathname === `/_/view/search${site.upstreamPrefix}`) {
    searchParameters(url.search.slice(1), false);
    return { kind: "search-post", site, upstream: `https://sites.google.com/_/view/search${site.upstreamPrefix}` };
  }
  if (!["GET", "HEAD"].includes(method) || url.pathname !== `/search${site.upstreamPrefix}`) return null;
  const parameters = searchParameters(url.search.slice(1), true);
  return {
    kind: "page",
    searchPage: true,
    site,
    path: "/_/search",
    upstream: `https://sites.google.com/search${site.upstreamPrefix}?${parameters}`,
    canonical: `${site.productionOrigin}/_/search?${parameters}`,
    previewPage: `${url.origin}${url.pathname}?${parameters}`,
    previewOrigin: url.origin
  };
}
function isSameOriginSearch2(request) {
  const expected = new URL(request.url).origin;
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite !== null && fetchSite !== "same-origin") return false;
  const origin = request.headers.get("Origin");
  if (origin !== null) return origin === expected;
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try {
    const url = new URL(referer);
    return url.origin === expected && !url.username && !url.password;
  } catch {
    return false;
  }
}
async function readBoundedText2(stream, limit, lengthHeader) {
  if (lengthHeader && /^\d+$/.test(lengthHeader) && Number(lengthHeader) > limit) throw new SearchInputError2(413);
  if (!stream) return "";
  const reader = stream.getReader();
  let chunks = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new SearchInputError2(413);
    }
    chunks = [...chunks, item.value];
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SearchInputError2();
  }
}
function validatedSearchMessage2(text) {
  if (new TextEncoder().encode(text).byteLength > SEARCH_BODY_LIMIT2) throw new SearchInputError2(413);
  const pairs = formPairs2(text);
  if (pairs.length !== 1 || pairs[0][0] !== "f.req") throw new SearchInputError2();
  let parsed;
  try {
    parsed = JSON.parse(pairs[0][1]);
  } catch {
    throw new SearchInputError2();
  }
  if (!Array.isArray(parsed) || ![2, 4].includes(parsed.length) || parsed[0] !== "at:ss:req") throw new SearchInputError2();
  const query = queryValue2(parsed[1]);
  if (parsed.length === 2) return Object.freeze(["at:ss:req", query]);
  if (parsed[2] !== null) throw new SearchInputError2();
  const cursor = cursorValue2(parsed[3]);
  return Object.freeze(["at:ss:req", query, null, cursor]);
}
function nestedArraySpan2(json, path) {
  let start = 0;
  let current = json;
  let span;
  for (const index of path) {
    span = arrayElementSpan(current, index);
    const raw = current.slice(span.start, span.end);
    const leading = raw.match(/^\s*/)[0].length;
    start += span.start + leading;
    current = raw.trim();
  }
  return { start, end: start + current.length };
}
function rewriteSearchResponse2(text, previewOrigin) {
  if (!text.startsWith(XSSI2)) throw new SearchInputError2(502);
  const framed = text.slice(XSSI2.length);
  const leading = framed.match(/^[ \t\r\n]*/)[0];
  const trailing = framed.match(/[ \t\r\n]*$/)[0];
  const json = framed.slice(leading.length, trailing.length ? -trailing.length : void 0);
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    throw new SearchInputError2(502);
  }
  if (!Array.isArray(data) || data.length !== 1 || !Array.isArray(data[0]) || data[0].length !== 15 || data[0][0] !== "at:ss:res" || data[0][1] !== null && !Array.isArray(data[0][1]) || Array.isArray(data[0][1]) && data[0][1].length > 10) throw new SearchInputError2(502);
  const patches = (data[0][1] ?? []).map((row, index) => {
    if (!Array.isArray(row) || row.length !== 4 || typeof row[0] !== "string" || !Array.isArray(row[1]) || !Array.isArray(row[2]) || typeof row[3] !== "string") throw new SearchInputError2(502);
    const rewritten2 = /[\s<>]/u.test(row[0]) ? row[0] : rewriteSiteUrl(row[0], previewOrigin);
    if (rewritten2 === row[0]) return null;
    const span = nestedArraySpan2(json, [0, 1, index, 0]);
    return { ...span, value: JSON.stringify(rewritten2).replaceAll("<", "\\u003c") };
  }).filter(Boolean);
  const rewritten = patches.reduceRight((value, patch) => value.slice(0, patch.start) + patch.value + value.slice(patch.end), json);
  return XSSI2 + leading + rewritten + trailing;
}
async function relaySearchPost2(request, plan, { fetchImpl, quota, now }) {
  if (!isSameOriginSearch2(request)) return searchError2(403);
  const type = request.headers.get("Content-Type") ?? "";
  if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset\s*=\s*UTF-8)?\s*$/i.test(type) || request.headers.has("Content-Encoding")) return searchError2(415);
  if (!quota(now())) return searchError2(429);
  let encodedBody;
  try {
    const message = validatedSearchMessage2(await readBoundedText2(request.body, SEARCH_BODY_LIMIT2, request.headers.get("Content-Length")));
    encodedBody = new URLSearchParams({ "f.req": JSON.stringify(message) }).toString();
    if (new TextEncoder().encode(encodedBody).byteLength > SEARCH_BODY_LIMIT2) throw new SearchInputError2(413);
  } catch (error2) {
    return searchError2(error2 instanceof SearchInputError2 ? error2.status : 400);
  }
  try {
    const upstream = await fetchImpl(plan.upstream, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json",
        "Accept-Language": plan.site.language,
        "User-Agent": "PLL-Isolated-SEO-Preview/1.0"
      },
      body: encodedBody,
      signal: AbortSignal.timeout(1e4)
    });
    if (upstream.status !== 200 || !/^application\/json(?:\s*;\s*charset\s*=\s*utf-8)?\s*$/i.test(upstream.headers.get("Content-Type") ?? "")) return searchError2(502);
    const text = await readBoundedText2(upstream.body, SEARCH_RESPONSE_LIMIT2, upstream.headers.get("Content-Length"));
    const rewritten = rewriteSearchResponse2(text, new URL(request.url).origin);
    return new Response(rewritten, { status: 200, headers: { ...headers2, "Content-Type": upstream.headers.get("Content-Type") } });
  } catch {
    return searchError2(502);
  }
}

// renderer/src/plan.js
var HOME_ALIASES = Object.freeze({ es: "inicio", en: "home", fr: "accueil", it: "inizio" });
var PREVIEW_DOMAIN = "pll-seo-preview-20261102.pages.dev";
var encoder = new TextEncoder();
var normalizePath2 = (path) => path.replace(/%[0-9a-f]{2}/gi, (value) => value.toUpperCase());
function error(context, status) {
  return { ...context, kind: "error", status };
}
function previewHost(host, root) {
  if (host === root) return true;
  if (!host.endsWith(`.${root}`)) return false;
  const label = host.slice(0, -root.length - 1);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label);
}
function unsafeInput(input) {
  const rawPath = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? "";
  if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(rawPath) || /%(?:2f|5c|2e|25)/i.test(rawPath) || rawPath.split("/").some((part) => part === "." || part === "..")) return true;
  try {
    const decoded = decodeURIComponent(rawPath);
    return /[\\\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(decoded);
  } catch {
    return true;
  }
}
function contextFor(url, options) {
  const sites = options.sites ?? SITES;
  const site = Object.values(sites).find((candidate) => candidate.productionHost === url.hostname);
  const isPreview2 = previewHost(url.hostname, options.previewDomain ?? PREVIEW_DOMAIN);
  if (!site && !isPreview2) return null;
  return {
    mode: site ? "production" : "preview",
    site,
    previewOrigin: url.origin,
    indexable: Boolean(site)
  };
}
function searchPlan(url, method, context) {
  const native = context.site && url.pathname === "/_/search";
  const path = native ? `/search${context.site.upstreamPrefix}` : url.pathname;
  let result;
  try {
    result = planSearchRequest(`${url.origin}${path}${url.search}`, method);
  } catch {
    return error({ ...context, indexable: false }, 400);
  }
  if (!result) return null;
  if (context.mode === "production" && result.site.language !== context.site.language) return error({ ...context, indexable: false }, 404);
  return {
    ...result,
    ...context,
    site: result.site,
    indexable: false,
    previewPage: native ? `${url.origin}/_/search${new URL(result.upstream).search}` : result.previewPage
  };
}
function contentPlan(url, context, options) {
  const match = context.mode === "preview" ? url.pathname.match(/^\/(es|en|fr|it)(\/.*)?$/) : null;
  if (context.mode === "preview" && !match) return error(context, 404);
  const site = context.site ?? (options.sites ?? SITES)[match[1]];
  const path = normalizePath2(context.mode === "preview" ? match[2] ?? "/" : url.pathname);
  if (path === "/_" || path.startsWith("/_/") || path === "/search" || path.startsWith("/search/")) return error(context, 404);
  const target = (options.redirects ?? REDIRECTS)[`${site.productionOrigin}${path}`];
  if (target) return { ...context, site, kind: "redirect", status: 301, location: `${target}${url.search}` };
  if (context.mode === "preview" && !(options.knownPaths ?? KNOWN_PATHS)[site.language].includes(path)) return error(context, 404);
  const preferredPath = path === `/${site.homeAlias ?? HOME_ALIASES[site.language]}` ? "/" : path;
  return {
    ...context,
    site,
    kind: "page",
    path,
    upstream: `${site.upstreamRoot}${path}${url.search}`,
    canonical: `${site.productionOrigin}${preferredPath}`,
    previewPage: `${url.origin}${url.pathname}${url.search}`
  };
}
function httpPlan(url, method, context, options) {
  if (context.mode === "preview" || !["GET", "HEAD"].includes(method)) return error(context, 400);
  const target = (options.redirects ?? REDIRECTS)[`${context.site.productionOrigin}${normalizePath2(url.pathname)}`];
  return { ...context, kind: "redirect", status: 301, location: `${target ?? `${context.site.productionOrigin}${url.pathname}`}${url.search}` };
}
function planDeliveryRequest(input, method = "GET", options = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    return { kind: "error", status: 400, indexable: false };
  }
  const context = contextFor(url, options);
  if (!context || url.port) return { kind: "error", status: 421, indexable: false };
  if (encoder.encode(input).byteLength > 8192 || encoder.encode(url.pathname).byteLength > 4096) return error(context, 414);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || unsafeInput(input)) return error(context, 400);
  if (url.protocol === "http:") return httpPlan(url, method, context, options);
  const search = searchPlan(url, method, context);
  if (search) return search;
  if (!["GET", "HEAD"].includes(method)) return error(context, 405);
  if (url.pathname === "/robots.txt") return { ...context, kind: "robots" };
  if (url.pathname === "/sitemap.xml") return { ...context, kind: "redirect", status: 301, location: "https://sitemaps.panamalegallab.com/sitemap-index.xml" };
  if (context.mode === "preview" && url.pathname === "/") return { ...context, kind: "index" };
  return contentPlan(url, context, options);
}
function productionTarget(url, sites) {
  if (!["http:", "https:"].includes(url.protocol) || url.port || url.username || url.password) return null;
  const site = Object.values(sites).find((candidate) => url.hostname === candidate.productionHost || url.origin === "https://sites.google.com" && (url.pathname === candidate.upstreamPrefix || url.pathname.startsWith(`${candidate.upstreamPrefix}/`)));
  if (!site) return null;
  const path = url.hostname === site.productionHost ? url.pathname : url.pathname.slice(site.upstreamPrefix.length) || "/";
  return `${site.productionOrigin}${path}${url.search}${url.hash}`;
}
function rewriteProductionUrl(value, sites = SITES) {
  if (!value || value.startsWith("#")) return value;
  let url;
  try {
    url = new URL(value, "https://sites.google.com");
  } catch {
    return value;
  }
  const direct = productionTarget(url, sites);
  if (direct) return direct;
  if (url.origin !== "https://www.google.com" || url.pathname !== "/url" || url.username || url.password || url.port) return value;
  const targets = url.searchParams.getAll("q");
  if (targets.length !== 1) return value;
  try {
    return productionTarget(new URL(targets[0]), sites) ?? value;
  } catch {
    return value;
  }
}

// renderer/vendor/worker.js
var PREVIEW_HEADERS = Object.freeze({
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
});
function previewResponse(body, status = 200, extraHeaders = {}, method = "GET") {
  return new Response(method === "HEAD" ? null : body, {
    status,
    headers: { ...PREVIEW_HEADERS, "Content-Type": "text/plain; charset=utf-8", ...extraHeaders }
  });
}
function makeAttributeHandler(name, previewOrigin) {
  return { element(element) {
    const original = element.getAttribute(name);
    const rewritten = rewriteImageReferences(rewriteSiteUrl(original, previewOrigin));
    if (rewritten !== original) element.setAttribute(name, rewritten);
  } };
}
function makeImageStyleHandler() {
  let buffer = "";
  return { text(chunk) {
    const content = buffer + chunk.text;
    if (content.length > 512e3) throw new Error("Inline style exceeds preview limit");
    buffer = chunk.lastInTextNode ? "" : content;
    if (!chunk.lastInTextNode) {
      chunk.remove();
      return;
    }
    chunk.replace(rewriteImageReferences(content), { html: true });
  } };
}
function makeScriptHandler(plan, { bootstrapMode = "rewrite-url", onConfigValidated } = {}) {
  let buffer = "";
  return { text(chunk) {
    const content = buffer + chunk.text;
    if (content.length > 512e3) throw new Error("Inline source exceeds preview limit");
    buffer = chunk.lastInTextNode ? "" : content;
    if (!chunk.lastInTextNode) {
      chunk.remove();
      return;
    }
    const script = rewriteKnownImagePreloader(content);
    if (bootstrapMode === "clear-google-redirect") {
      const rewritten = clearGoogleRedirectConfig(script, plan.upstream);
      if (/^\s*_at_config\s*=/.test(script)) onConfigValidated?.();
      chunk.replace(rewritten, { html: true });
    } else chunk.replace(rewriteBootstrapConfig(script, plan.upstream, plan.previewPage), { html: true });
  } };
}
function rewriteHtml(response, plan, Rewriter, { bootstrapMode = "rewrite-url" } = {}) {
  let configurations = 0;
  const canonical = plan.canonical.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const rewriter = new Rewriter().on("head", { element(element) {
    element.append(`<link rel="canonical" href="${canonical}">`, { html: true });
  } }).on('link[rel~="canonical"]', { element(element) {
    element.remove();
  } }).on('meta[property="og:url"], meta[itemprop="url"]', { element(element) {
    element.setAttribute("content", plan.canonical);
  } }).on("script:not([src])", makeScriptHandler(plan, { bootstrapMode, onConfigValidated() {
    configurations += 1;
  } })).on("style", makeImageStyleHandler()).on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeAttributeHandler("content", plan.previewOrigin));
  for (const attribute of ["href", "src", "srcset", "style", "action", "data-url"]) {
    rewriter.on(`[${attribute}]`, makeAttributeHandler(attribute, plan.previewOrigin));
  }
  if (bootstrapMode === "clear-google-redirect") {
    rewriter.onDocument({ end() {
      if (configurations !== 1) throw new PreviewCompatibilityError();
    } });
  }
  return rewriter.transform(response);
}
function safeUpstreamHeaders(upstream) {
  const omitted = [
    "set-cookie",
    "content-length",
    "content-encoding",
    "alt-svc",
    "reporting-endpoints",
    ...Object.keys(PREVIEW_HEADERS).map((name) => name.toLowerCase())
  ];
  return new Headers([
    ...Array.from(upstream.headers).filter(([name]) => !omitted.includes(name.toLowerCase())),
    ...Object.entries(PREVIEW_HEADERS)
  ]);
}
function createHandler({
  fetchImpl = fetch,
  Rewriter,
  now = Date.now,
  quota = createQuota(),
  searchQuota = createQuota(60),
  bootstrapMode = "rewrite-url"
} = {}) {
  return async (request) => {
    let plan = planRequest(request.url);
    if (plan.kind === "forbidden-host") {
      return new Response("This preview has no production binding.", { status: 421, headers: { "Cache-Control": "no-store" } });
    }
    if (plan.kind === "error" && plan.status !== 404) return previewResponse("Invalid preview request.", plan.status, {}, request.method);
    let searchPlan2;
    try {
      searchPlan2 = planSearchRequest(request.url, request.method);
    } catch (error2) {
      return searchError2(error2 instanceof SearchInputError2 ? error2.status : 400);
    }
    if (searchPlan2?.kind === "search-post") return relaySearchPost2(request, searchPlan2, { fetchImpl, quota: searchQuota, now });
    if (searchPlan2) plan = searchPlan2;
    if (!["GET", "HEAD"].includes(request.method)) return previewResponse("Method not allowed.", 405, { Allow: "GET, HEAD" });
    if (plan.kind === "error") return previewResponse("Preview page not found.", plan.status, {}, request.method);
    if (plan.kind === "redirect") return previewResponse(null, 301, { Location: plan.location }, request.method);
    if (plan.kind === "robots") return previewResponse("User-agent: *\nDisallow:\n", 200, {}, request.method);
    if (plan.kind === "index") {
      const links2 = Object.keys(SITES).map((language) => `<li><a href="/${language}/">${language.toUpperCase()}</a></li>`).join("");
      return previewResponse(`<!doctype html><html lang="es"><meta name="robots" content="noindex,nofollow"><title>Panam\xE1 Legal Lab \u2014 vista previa</title><h1>Vista previa</h1><ul>${links2}</ul></html>`, 200, { "Content-Type": "text/html; charset=utf-8" }, request.method);
    }
    if (plan.searchPage && !searchQuota(now())) return searchError2(429);
    if (!quota(now())) return previewResponse("Preview request limit reached. Try again shortly.", 429, { "Retry-After": "60" }, request.method);
    let upstream;
    try {
      upstream = await fetchImpl(plan.upstream, {
        method: request.method,
        redirect: "manual",
        headers: { Accept: "text/html", "Accept-Language": plan.site.language, "User-Agent": "PLL-Isolated-SEO-Preview/1.0" },
        signal: AbortSignal.timeout(2e4)
      });
    } catch {
      return previewResponse("The public source is temporarily unavailable.", 502, {}, request.method);
    }
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get("Location");
      const rewritten = rewriteSiteUrl(location, plan.previewOrigin);
      if (!rewritten || rewritten === location) return previewResponse("The public source returned an unexpected redirect.", 502, {}, request.method);
      return previewResponse(null, upstream.status, { Location: rewritten }, request.method);
    }
    const headers3 = safeUpstreamHeaders(upstream);
    let body = request.method === "HEAD" ? null : upstream.body;
    if (plan.searchPage && body) {
      try {
        body = await readBoundedText2(body, SEARCH_HTML_LIMIT, upstream.headers.get("Content-Length"));
      } catch {
        return searchError2(502);
      }
    }
    const response = new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: headers3 });
    if (request.method === "HEAD" || !headers3.get("Content-Type")?.toLowerCase().includes("text/html")) return response;
    if (bootstrapMode !== "clear-google-redirect") return rewriteHtml(response, plan, Rewriter ?? HTMLRewriter);
    if (upstream.status !== 200) return response;
    try {
      const rewritten = rewriteHtml(response, plan, Rewriter ?? HTMLRewriter, { bootstrapMode });
      const html = await rewritten.text();
      return new Response(html, { status: response.status, statusText: response.statusText, headers: headers3 });
    } catch {
      return previewResponse("Preview compatibility validation failed: unsupported Google Sites configuration.", 502, {}, request.method);
    }
  };
}
var handler = createHandler();

// renderer/src/config-query.js
var invalidText = (value) => /[\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value);
function fixedSourceBase(base, site) {
  if (!Object.values(SITES).some((candidate) => candidate.upstreamRoot === site?.upstreamRoot && candidate.upstreamPrefix === site?.upstreamPrefix)) return false;
  let url;
  try {
    url = new URL(base);
  } catch {
    return false;
  }
  if (url.href !== base || url.origin !== "https://sites.google.com" || url.username || url.password || url.port || url.hash || url.search) return false;
  return base === site.upstreamRoot || base.startsWith(`${site.upstreamRoot}/`) || base === `https://sites.google.com/search${site.upstreamPrefix}`;
}
function decodeComponent(value) {
  const decoded = decodeURIComponent(value.replaceAll("+", " "));
  if (invalidText(decoded)) throw new URIError("Invalid query text.");
  return decoded;
}
function orderedPairs(query) {
  if (!query) return [];
  return query.split("&").map((field) => {
    if (!field) throw new URIError("Empty query segment.");
    const equals = field.indexOf("=");
    return [
      decodeComponent(equals < 0 ? field : field.slice(0, equals)),
      decodeComponent(equals < 0 ? "" : field.slice(equals + 1))
    ];
  });
}
function equivalentSourceQuery(actual, expected, site) {
  if (typeof actual !== "string" || typeof expected !== "string" || actual.includes("#") || expected.includes("#") || invalidText(actual) || invalidText(expected)) return false;
  const actualStart = actual.indexOf("?");
  const expectedStart = expected.indexOf("?");
  const actualBase = actualStart < 0 ? actual : actual.slice(0, actualStart);
  const expectedBase = expectedStart < 0 ? expected : expected.slice(0, expectedStart);
  if (actualBase !== expectedBase || !fixedSourceBase(expectedBase, site)) return false;
  try {
    const actualPairs = orderedPairs(actualStart < 0 ? "" : actual.slice(actualStart + 1));
    const expectedPairs = orderedPairs(expectedStart < 0 ? "" : expected.slice(expectedStart + 1));
    return actualPairs.length === expectedPairs.length && actualPairs.every(([key, value], index) => key === expectedPairs[index][0] && value === expectedPairs[index][1]);
  } catch {
    return false;
  }
}
function clearEquivalentQueryConfig(text, plan) {
  const assignment = /^\s*_at_config\s*=\s*/.exec(text);
  if (!assignment) throw new PreviewCompatibilityError();
  const remainder = text.slice(assignment[0].length);
  let actual;
  try {
    const span = arrayElementSpan(remainder, 316);
    actual = JSON.parse(remainder.slice(span.start, span.end));
  } catch (error2) {
    if (error2 instanceof SyntaxError || error2 instanceof PreviewCompatibilityError) throw new PreviewCompatibilityError();
    throw error2;
  }
  if (!equivalentSourceQuery(actual, plan.upstream, plan.site)) throw new PreviewCompatibilityError();
  return clearGoogleRedirectConfig(text, actual);
}

// renderer/data/readiness.json
var readiness_default = { schemaVersion: 1, draft: true, descriptions: { "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama": { language: "es", text: "Constituci\xF3n de sociedades en Panam\xE1 para actividad operativa o internacional. Revisi\xF3n previa de objetivos, estructura y documentaci\xF3n del proyecto." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama": { language: "en", text: "Company formation in Panama for operating or international activities. Prior review of the project's objectives, structure and available documentation." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama": { language: "fr", text: "Constitution de soci\xE9t\xE9s au Panama pour une activit\xE9 locale ou internationale. Examen pr\xE9alable des objectifs, de la structure et des documents du projet." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama": { language: "it", text: "Costituzione di societ\xE0 a Panama: attivit\xE0 operative, strutture internazionali ed espansione aziendale. Valutazione del progetto e dei documenti." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama": { language: "es", text: "Constituci\xF3n, mantenimiento y revisi\xF3n documental de sociedades an\xF3nimas en Panam\xE1. An\xE1lisis previo de actividad, propiedad y obligaciones corporativas." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama": { language: "en", text: "Incorporation, maintenance and document review for Panamanian corporations. Prior assessment of activity, ownership and corporate obligations." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama": { language: "fr", text: "Constitution, maintien et r\xE9vision documentaire de soci\xE9t\xE9s anonymes au Panama. Examen pr\xE9alable de l'activit\xE9, de la propri\xE9t\xE9 et des obligations." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama": { language: "it", text: "Costituzione, mantenimento e revisione documentale di societ\xE0 anonime a Panama. Analisi preventiva di attivit\xE0, propriet\xE0 e obblighi societari." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama": { language: "es", text: "Sociedades de responsabilidad limitada en Panam\xE1: constituci\xF3n, mantenimiento y revisi\xF3n documental seg\xFAn la actividad y la estructura de socios." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama": { language: "en", text: "Limited liability companies in Panama: incorporation, maintenance and document review based on the intended activity and partner structure." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama": { language: "fr", text: "Soci\xE9t\xE9s \xE0 responsabilit\xE9 limit\xE9e au Panama : constitution, maintien et r\xE9vision documentaire selon l'activit\xE9 et la structure des associ\xE9s." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama": { language: "it", text: "Societ\xE0 a responsabilit\xE0 limitata a Panama: costituzione, mantenimento e revisione documentale secondo l'attivit\xE0 e la struttura dei soci." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama": { language: "es", text: "Creaci\xF3n y revisi\xF3n documental de fundaciones de inter\xE9s privado en Panam\xE1: acta fundacional, reglamento privado y adecuaci\xF3n a objetivos patrimoniales." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation": { language: "en", text: "Private interest foundations in Panama: creation, document review, foundation charter and private regulations for wealth planning or family purposes." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama": { language: "fr", text: "Fondations d'int\xE9r\xEAt priv\xE9 au Panama : cr\xE9ation, r\xE9vision documentaire, acte de fondation et r\xE8glement priv\xE9 selon les objectifs patrimoniaux." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama": { language: "it", text: "Fondazioni di interesse privato a Panama: creazione, revisione documentale, atto fondazionale e regolamento privato secondo gli obiettivi patrimoniali." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional": { language: "es", text: "Sociedades offshore en Panam\xE1 para actividad internacional. Revisi\xF3n caso por caso de la actividad real, la residencia fiscal y la documentaci\xF3n." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international": { language: "en", text: "Offshore companies in Panama for international activity. Case-by-case review of actual activity, tax residence and the required documentation." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international": { language: "fr", text: "Soci\xE9t\xE9s offshore au Panama pour une activit\xE9 internationale. Examen au cas par cas de l'activit\xE9 r\xE9elle, de la r\xE9sidence fiscale et des documents." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali": { language: "it", text: "Societ\xE0 offshore a Panama per attivit\xE0 internazionale. Analisi caso per caso dell'attivit\xE0 reale, della residenza fiscale e della documentazione." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama": { language: "es", text: "Sociedades para desarrollar actividad econ\xF3mica en Panam\xE1: estructura, permisos y obligaciones fiscales y documentales seg\xFAn el proyecto." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama": { language: "en", text: "Companies carrying out economic activity in Panama: structure, applicable permits, tax obligations and documentation reviewed for the project." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama": { language: "fr", text: "Soci\xE9t\xE9s exer\xE7ant une activit\xE9 \xE9conomique au Panama : structure, permis, obligations fiscales et documentaires \xE0 examiner selon le projet." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama": { language: "it", text: "Societ\xE0 con attivit\xE0 economica a Panama: struttura, permessi e obblighi fiscali e documentali da esaminare secondo il progetto." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual": { language: "es", text: "Oficina virtual en Panam\xE1 para soporte administrativo y correspondencia. Revisi\xF3n de su adecuaci\xF3n a la actividad y obligaciones de la sociedad." }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office": { language: "en", text: "Virtual office in Panama for administrative support and correspondence. Review of its suitability for the company's activity and obligations." }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel": { language: "fr", text: "Bureau virtuel au Panama pour le support administratif et la correspondance. Examen de son ad\xE9quation \xE0 l'activit\xE9 et aux obligations de la soci\xE9t\xE9." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale": { language: "it", text: "Ufficio virtuale a Panama per supporto amministrativo e corrispondenza. Valutazione dell'idoneit\xE0 rispetto all'attivit\xE0 e agli obblighi della societ\xE0." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama": { language: "es", text: "Cuentas bancarias personales y corporativas en Panam\xE1: requisitos y preparaci\xF3n documental. Apertura sujeta a revisi\xF3n y aprobaci\xF3n de cada banco." }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama": { language: "en", text: "Personal and corporate bank accounts in Panama: requirements and document preparation. Opening is subject to each bank's review and approval." }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama": { language: "fr", text: "Comptes bancaires personnels et d'entreprise au Panama : exigences et pr\xE9paration documentaire. Ouverture soumise \xE0 l'examen et \xE0 l'accord de la banque." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama": { language: "it", text: "Conti bancari personali e societari a Panama: requisiti e preparazione documentale. Apertura soggetta alla verifica e all\u2019approvazione della banca." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama": { language: "es", text: "Preparaci\xF3n documental y acompa\xF1amiento para una cuenta personal en Panam\xE1. Apertura sujeta al perfil del cliente y a la aprobaci\xF3n de cada banco." }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama": { language: "en", text: "Document preparation and support for a personal bank account in Panama. Opening depends on the client's profile and the bank's final approval." }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama": { language: "fr", text: "Pr\xE9paration documentaire et accompagnement pour un compte personnel au Panama. Ouverture selon le profil du client et l'approbation de la banque." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama": { language: "it", text: "Preparazione documentale e assistenza per un conto personale a Panama. Apertura soggetta al profilo del cliente e all'approvazione della banca." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama": { language: "es", text: "Preparaci\xF3n del expediente bancario de sociedades paname\xF1as o extranjeras. Cuenta corporativa en Panam\xE1 sujeta a revisi\xF3n y aprobaci\xF3n de la entidad." }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama": { language: "en", text: "Banking file preparation for Panamanian or foreign companies. Corporate accounts in Panama remain subject to the bank's review and approval." }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama": { language: "fr", text: "Pr\xE9paration du dossier bancaire de soci\xE9t\xE9s panam\xE9ennes ou \xE9trang\xE8res. Compte d'entreprise au Panama soumis \xE0 l'examen et \xE0 l'approbation de la banque." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama": { language: "it", text: "Preparazione della pratica bancaria per societ\xE0 panamensi o estere. Conto societario a Panama soggetto alla verifica e all'approvazione della banca." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama": { language: "es", text: "Permisos y visados de residencia en Panam\xE1. Evaluaci\xF3n del caso, revisi\xF3n documental y acompa\xF1amiento del tr\xE1mite seg\xFAn la categor\xEDa aplicable." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama": { language: "en", text: "Residence permits and visas in Panama. Assessment of your case, document review and support with the process under the applicable category." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama": { language: "fr", text: "Permis et visas de r\xE9sidence au Panama. \xC9valuation du dossier, examen des documents et accompagnement selon la cat\xE9gorie applicable." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama": { language: "it", text: "Permessi e visti di residenza a Panama. Valutazione del caso, verifica dei documenti e assistenza nella procedura secondo la categoria applicabile." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama": { language: "es", text: "Residencia en Panam\xE1 bajo la categor\xEDa de Pa\xEDses Amigos: v\xEDas de solicitud, requisitos y documentaci\xF3n seg\xFAn el perfil del solicitante." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa": { language: "en", text: "Panama residency under the Friendly Nations category: application routes, requirements and documentation according to the applicant\u2019s profile." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama": { language: "fr", text: "R\xE9sidence au Panama sous la cat\xE9gorie des Pays Amicaux : voies de demande, exigences et documents selon le profil du demandeur." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici": { language: "it", text: "Residenza a Panama nella categoria Paesi Amici: modalit\xE0 di richiesta, requisiti e documentazione secondo il profilo del richiedente." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama": { language: "es", text: "Residencia por inversi\xF3n en Panam\xE1. Revisi\xF3n del tipo de inversi\xF3n, origen de fondos y documentaci\xF3n antes de evaluar la solicitud." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa": { language: "en", text: "Residency through investment in Panama. Review of the investment type, source of funds and documentation before assessing the application." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama": { language: "fr", text: "R\xE9sidence par investissement au Panama. Examen du type d\u2019investissement, de l\u2019origine des fonds et des documents avant l\u2019\xE9valuation du dossier." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore": { language: "it", text: "Residenza tramite investimento a Panama. Esame del tipo di investimento, dell\u2019origine dei fondi e dei documenti prima di valutare la richiesta." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama": { language: "es", text: "Residencia para jubilados y pensionados en Panam\xE1. Revisi\xF3n de la pensi\xF3n, la documentaci\xF3n y la situaci\xF3n familiar del solicitante." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa": { language: "en", text: "Residency for retirees and pensioners in Panama. Review of pension evidence, documentation and the applicant\u2019s family circumstances." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama": { language: "fr", text: "R\xE9sidence pour retrait\xE9s et pensionn\xE9s au Panama. Examen des justificatifs de pension, des documents et de la situation familiale du demandeur." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato": { language: "it", text: "Residenza per pensionati a Panama. Verifica della pensione, della documentazione e della situazione familiare del richiedente." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama": { language: "es", text: "Residencia por reagrupaci\xF3n familiar en Panam\xE1: categor\xEDas, requisitos y documentaci\xF3n seg\xFAn el v\xEDnculo familiar. Revisi\xF3n individual de cada caso." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa": { language: "en", text: "Family reunification residency in Panama: categories, requirements and documentation according to the family relationship. Individual case review." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama": { language: "fr", text: "R\xE9sidence par regroupement familial au Panama : cat\xE9gories, exigences et documents selon le lien familial. Examen individuel du dossier." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare": { language: "it", text: "Residenza per ricongiungimento familiare a Panama: categorie, requisiti e documenti secondo il legame familiare. Esame individuale del caso." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama": { language: "es", text: "Residencia para profesionales extranjeros en Panam\xE1: titulaci\xF3n, documentaci\xF3n y revisi\xF3n del perfil profesional y de los requisitos aplicables." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa": { language: "en", text: "Residency for foreign professionals in Panama: qualifications, documentation and review of the professional profile and applicable requirements." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama": { language: "fr", text: "R\xE9sidence pour professionnels \xE9trangers au Panama : dipl\xF4mes, documents et examen du profil professionnel et des exigences applicables." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti": { language: "it", text: "Residenza per professionisti stranieri a Panama: titoli di studio, documentazione ed esame del profilo professionale e dei requisiti applicabili." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama": { language: "es", text: "Permiso temporal de estudios en Panam\xE1: matr\xEDcula, documentaci\xF3n acad\xE9mica y requisitos de la solicitud seg\xFAn la situaci\xF3n del estudiante." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit": { language: "en", text: "Temporary study permit in Panama: enrollment, academic documentation and application requirements according to the student\u2019s circumstances." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama": { language: "fr", text: "Permis temporaire pour \xE9tudes au Panama : inscription, documents acad\xE9miques et exigences de la demande selon la situation de l\u2019\xE9tudiant." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti": { language: "it", text: "Permesso temporaneo per studio a Panama: iscrizione, documentazione accademica e requisiti della richiesta secondo la situazione dello studente." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama": { language: "es", text: "Residencia para trabajadores extranjeros dentro del 10% en Panam\xE1: empresa contratante, contrato laboral y documentaci\xF3n de la solicitud." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10": { language: "en", text: "Residence permit for foreign workers within Panama\u2019s 10% category: hiring company, employment contract and application documentation." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama": { language: "fr", text: "R\xE9sidence pour travailleurs \xE9trangers dans la cat\xE9gorie des 10 % au Panama : employeur, contrat de travail et documents de la demande." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10": { language: "it", text: "Residenza per lavoratori stranieri nella categoria del 10% a Panama: impresa datrice di lavoro, contratto e documenti della richiesta." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama": { language: "es", text: "Residencia para expertos o t\xE9cnicos dentro del 15% en Panam\xE1: puesto especializado, empresa contratante y documentaci\xF3n de la solicitud." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15": { language: "en", text: "Residency for experts or technicians within Panama\u2019s 15% category: specialized position, hiring company and application documentation." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama": { language: "fr", text: "R\xE9sidence pour experts ou techniciens dans la cat\xE9gorie des 15 % au Panama : poste sp\xE9cialis\xE9, employeur et documents de la demande." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15": { language: "it", text: "Residenza per esperti o tecnici nella categoria del 15% a Panama: incarico specializzato, impresa datrice di lavoro e documenti della richiesta." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama": { language: "es", text: "Permisos de residencia para trabajadores de empresas con licencia SEM en Panam\xE1: categor\xEDas, documentaci\xF3n y certificaci\xF3n de la empresa." }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters": { language: "en", text: "Residence permits for employees of SEM-licensed companies in Panama: categories, documentation and company certification." }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama": { language: "fr", text: "Permis de r\xE9sidence pour salari\xE9s d\u2019entreprises titulaires d\u2019une licence SEM au Panama : cat\xE9gories, documents et certification de l\u2019entreprise." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali": { language: "it", text: "Permessi di residenza per lavoratori di imprese con licenza SEM a Panama: categorie, documentazione e certificazione dell\u2019impresa." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama": { language: "es", text: "Revisi\xF3n legal, registral, documental y fiscal de operaciones inmobiliarias en Panam\xE1. Acompa\xF1amiento a compradores, vendedores e inversores." }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama": { language: "en", text: "Legal, registry, documentary and tax review of real estate transactions in Panama. Support for buyers, sellers and investors." }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama": { language: "fr", text: "Examen juridique, foncier, documentaire et fiscal d\u2019op\xE9rations immobili\xE8res au Panama. Accompagnement des acheteurs, vendeurs et investisseurs." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama": { language: "it", text: "Verifica legale, registrale, documentale e fiscale di operazioni immobiliari a Panama. Assistenza ad acquirenti, venditori e investitori." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama": { language: "es", text: "PH GrandBay en Panam\xE1: ficha de apartamento y caracter\xEDsticas publicadas. Consulta su descripci\xF3n y solicita informaci\xF3n actualizada." }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama": { language: "en", text: "PH GrandBay in Panama: apartment profile and published features. Read the description and request up-to-date property information." }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama": { language: "fr", text: "PH GrandBay au Panama : fiche d\u2019appartement et caract\xE9ristiques publi\xE9es. Consultez la description et demandez des informations \xE0 jour." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama": { language: "it", text: "PH GrandBay a Panama: scheda dell\u2019appartamento e caratteristiche pubblicate. Consulta la descrizione e richiedi informazioni aggiornate." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama": { language: "es", text: "PH Start & Herald: ficha de apartamento en Casco Antiguo, Panam\xE1. Descripci\xF3n y caracter\xEDsticas publicadas; solicita informaci\xF3n actualizada." }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama": { language: "en", text: "PH Start & Herald: apartment profile in Panama\u2019s Old Town. Published description and features; request up-to-date property information." }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama": { language: "fr", text: "PH Start & Herald : fiche d\u2019appartement dans le Vieux Quartier au Panama. Description et caract\xE9ristiques publi\xE9es ; demandez des informations \xE0 jour." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama": { language: "it", text: "PH Start & Herald: scheda di un appartamento nel Casco Antiguo a Panama. Descrizione e caratteristiche pubblicate; richiedi informazioni aggiornate." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama": { language: "es", text: "PH Plaza Catedral en Panam\xE1: ficha de apartamento con descripci\xF3n y caracter\xEDsticas publicadas. Solicita informaci\xF3n actualizada del inmueble." }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama": { language: "en", text: "PH Catedral Square in Panama: apartment profile with a published description and features. Request up-to-date property information." }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama": { language: "fr", text: "PH Place Cath\xE9drale au Panama : fiche d\u2019appartement, description et caract\xE9ristiques publi\xE9es. Demandez des informations \xE0 jour sur le bien." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama": { language: "it", text: "PH Piazza Cattedrale a Panama: scheda dell\u2019appartamento con descrizione e caratteristiche pubblicate. Richiedi informazioni aggiornate sull\u2019immobile." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama": { language: "es", text: "Local comercial en Plaza Catedral, Panam\xE1: ficha con descripci\xF3n y caracter\xEDsticas t\xE9cnicas publicadas. Consulta detalles actualizados." }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama": { language: "en", text: "Commercial premises in Cathedral Square, Panama: profile with a published description and technical features. Request current details." }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama": { language: "fr", text: "Local commercial \xE0 la Place Cath\xE9drale au Panama : fiche, description et caract\xE9ristiques techniques publi\xE9es. Demandez des d\xE9tails \xE0 jour." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama": { language: "it", text: "Locale commerciale in Piazza Cattedrale a Panama: scheda con descrizione e caratteristiche tecniche pubblicate. Richiedi dettagli aggiornati." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana": { language: "es", text: "Residencia en Espa\xF1a: an\xE1lisis del motivo del traslado, la situaci\xF3n personal y la documentaci\xF3n para estudiar una v\xEDa adecuada a cada caso." }, "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain": { language: "en", text: "Residency in Spain: assessment of your circumstances, reasons for moving and required documents before choosing a residence route." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne": { language: "fr", text: "R\xE9sidence en Espagne : analyse de votre situation, du motif de votre installation et des documents n\xE9cessaires avant de choisir une voie de s\xE9jour." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna": { language: "it", text: "Residenza in Spagna: valutazione della tua situazione, del motivo del trasferimento e dei documenti necessari prima di scegliere un percorso." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia": { language: "es", text: "Nacionalidad espa\xF1ola por residencia: revisi\xF3n del historial de residencia, continuidad y documentaci\xF3n antes de preparar una solicitud." }, "https://en.panamalegallab.com/our-services-in-spain/spanish-citizenship-by-residence": { language: "en", text: "Spanish citizenship by residence: review of your residence history, continuity and supporting documents before preparing an application." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-espagnole-par-residence": { language: "fr", text: "Nationalit\xE9 espagnole par r\xE9sidence : examen de votre historique de r\xE9sidence, de sa continuit\xE9 et des documents avant de pr\xE9parer une demande." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza": { language: "it", text: "Cittadinanza spagnola per residenza: esame della storia e continuit\xE0 della residenza e dei documenti prima di preparare la domanda." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana": { language: "es", text: "Revisi\xF3n de v\xEDnculos familiares, inscripciones y documentaci\xF3n para estudiar la nacionalidad espa\xF1ola por opci\xF3n u otras v\xEDas familiares." }, "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain": { language: "en", text: "Spanish citizenship by option and other family-based routes: review of parentage, Civil Registry entries and documents for an individual assessment." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne": { language: "fr", text: "Nationalit\xE9 espagnole par option et autres voies familiales : examen de la filiation, des inscriptions et des documents selon votre situation." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia": { language: "it", text: "Cittadinanza spagnola per opzione e altre vie familiari: esame della filiazione, delle iscrizioni e dei documenti per valutare ogni caso." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol": { language: "es", text: "Investigaci\xF3n del origen espa\xF1ol: b\xFAsqueda documental por fases para reconstruir una l\xEDnea familiar y localizar nombres, fechas, lugares y registros." }, "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research": { language: "en", text: "Spanish ancestry research: a phased search of records to reconstruct your family line and identify names, dates, places and possible sources." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles": { language: "fr", text: "Recherche des origines espagnoles : recherche documentaire par \xE9tapes pour reconstituer votre lign\xE9e familiale et identifier des noms, dates et lieux." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole": { language: "it", text: "Ricerca delle origini spagnole: ricerca documentale per fasi per ricostruire la linea familiare e individuare nomi, date, luoghi e possibili fonti." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana": { language: "es", text: "Partidas y certificados en Espa\xF1a: identificaci\xF3n del documento y solicitud al registro correspondiente; valoraci\xF3n de una b\xFAsqueda si faltan datos." }, "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain": { language: "en", text: "Records and certificates in Spain: identifying the document and requesting it from the relevant registry, assessing a search when details are missing." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne": { language: "fr", text: "Actes et certificats en Espagne : identification du document et demande au registre comp\xE9tent, avec \xE9valuation d\u2019une recherche si des informations manquent." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna": { language: "it", text: "Atti e certificati in Spagna: individuazione del documento e richiesta al registro competente, valutando una ricerca se mancano informazioni." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana": { language: "es", text: "Expedientes LMD ya iniciados: revisi\xF3n de documentaci\xF3n, comunicaciones y pr\xF3ximos pasos de expedientes presentados o citas solicitadas en plazo." }, "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain": { language: "en", text: "Existing LMD cases: review of documents, correspondence and next steps for applications submitted or appointments requested within the deadline." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne": { language: "fr", text: "Dossiers LMD d\xE9j\xE0 engag\xE9s : examen des documents, des communications et des prochaines \xE9tapes pour les d\xE9marches engag\xE9es dans les d\xE9lais." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate": { language: "it", text: "Pratiche LMD gi\xE0 avviate: esame dei documenti, delle comunicazioni e dei prossimi passi per pratiche presentate o appuntamenti richiesti nei termini." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana": { language: "es", text: "Establecimiento e inversi\xF3n en Espa\xF1a: revisi\xF3n previa de las implicaciones jur\xEDdicas, fiscales y documentales de proyectos empresariales o inmobiliarios." }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain": { language: "en", text: "Establishing a business and investing in Spain: prior review of the legal, tax and documentation implications of business or property projects." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne": { language: "fr", text: "Cr\xE9ation d\u2019activit\xE9 et investissement en Espagne : examen pr\xE9alable des implications juridiques, fiscales et documentaires des projets." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento": { language: "it", text: "Insediamento e investimento in Spagna: esame preliminare delle implicazioni legali, fiscali e documentali dei progetti imprenditoriali o immobiliari." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles": { language: "es", text: "Vivienda unifamiliar en Canyelles (Garraf): consulta la ficha del inmueble y sus caracter\xEDsticas t\xE9cnicas antes de solicitar informaci\xF3n." }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain": { language: "en", text: "Single-family home in Canyelles (Garraf): review the property description and technical features, then request further details." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne": { language: "fr", text: "Maison unifamiliale \xE0 Canyelles (Garraf) : consultez la fiche du bien et ses caract\xE9ristiques techniques avant de demander des informations." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama": { language: "it", text: "Abitazione unifamiliare a Canyelles (Garraf): consulta la scheda dell\u2019immobile e le caratteristiche tecniche prima di richiedere informazioni." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera": { language: "es", text: "Vivienda unifamiliar en Llagostera, en el entorno Girona\u2013Costa Brava: descripci\xF3n del inmueble, caracter\xEDsticas y contacto para ampliar informaci\xF3n." }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain": { language: "en", text: "Single-family home in Llagostera, in the Girona\u2013Costa Brava area: property description, features and contact for further information." }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne": { language: "fr", text: "Maison unifamiliale \xE0 Llagostera, dans la r\xE9gion Girona\u2013Costa Brava : description du bien, caract\xE9ristiques et contact pour en savoir plus." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna": { language: "it", text: "Abitazione unifamiliare a Llagostera, nell\u2019area Girona\u2013Costa Brava: descrizione dell\u2019immobile, caratteristiche e contatto per maggiori informazioni." }, "https://www.panamalegallab.com/": { language: "es", text: "Panama Legal Lab: empresas, banca, residencia e inmuebles en Panam\xE1; residencia, nacionalidad, investigaci\xF3n del origen espa\xF1ol y documentos en Espa\xF1a." }, "https://en.panamalegallab.com/": { language: "en", text: "Panama Legal Lab: companies, banking, residence and property in Panama; residency, nationality, Spanish ancestry research and documents in Spain." }, "https://fr.panamalegallab.com/": { language: "fr", text: "Panama Legal Lab : entreprises, banque, r\xE9sidence et immobilier au Panama ; r\xE9sidence, nationalit\xE9, recherche d\u2019origines espagnoles et documents en Espagne." }, "https://it.panamalegallab.com/": { language: "it", text: "Panama Legal Lab: imprese, servizi bancari, residenza e immobili a Panama; residenza, cittadinanza, ricerca delle origini spagnole e documenti in Spagna." }, "https://www.panamalegallab.com/nuestros-servicios-en-panama": { language: "es", text: "Servicios en Panam\xE1 para empresas, banca, residencia e inversi\xF3n inmobiliaria. Evaluaci\xF3n del caso, an\xE1lisis de viabilidad y coordinaci\xF3n documental." }, "https://en.panamalegallab.com/our-services-in-panama": { language: "en", text: "Services in Panama for companies, banking, residence and property investment. Case assessment, feasibility review and document coordination." }, "https://fr.panamalegallab.com/nos-services-au-panama": { language: "fr", text: "Services au Panama : entreprises, banque, r\xE9sidence et investissement immobilier. \xC9valuation du dossier, faisabilit\xE9 et coordination documentaire." }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama": { language: "it", text: "Servizi a Panama per imprese, servizi bancari, residenza e investimenti immobiliari. Valutazione del caso, fattibilit\xE0 e coordinamento documentale." }, "https://www.panamalegallab.com/nuestros-servicios-en-espana": { language: "es", text: "Residencia y nacionalidad en Espa\xF1a, investigaci\xF3n del origen espa\xF1ol y obtenci\xF3n de partidas y certificados. Orientaci\xF3n seg\xFAn tu situaci\xF3n y documentos." }, "https://en.panamalegallab.com/our-services-in-spain": { language: "en", text: "Residency and nationality in Spain, Spanish ancestry research, and registry records and certificates. Guidance based on your circumstances and documents." }, "https://fr.panamalegallab.com/nos-Services-au-espagne": { language: "fr", text: "R\xE9sidence et nationalit\xE9 en Espagne, recherches sur les origines espagnoles, actes et certificats. Orientation selon votre situation et vos documents." }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna": { language: "it", text: "Residenza e cittadinanza in Spagna, ricerca delle origini spagnole, atti e certificati. Indicazioni in base alla tua situazione e ai documenti." } }, languageLinks: { "https://www.panamalegallab.com/": { language: "es", alternatives: { en: "https://en.panamalegallab.com/", fr: "https://fr.panamalegallab.com/", it: "https://it.panamalegallab.com/" } }, "https://en.panamalegallab.com/": { language: "en", alternatives: { es: "https://www.panamalegallab.com/", fr: "https://fr.panamalegallab.com/", it: "https://it.panamalegallab.com/" } }, "https://fr.panamalegallab.com/": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/", en: "https://en.panamalegallab.com/", it: "https://it.panamalegallab.com/" } }, "https://it.panamalegallab.com/": { language: "it", alternatives: { es: "https://www.panamalegallab.com/", en: "https://en.panamalegallab.com/", fr: "https://fr.panamalegallab.com/" } }, "https://www.panamalegallab.com/sobre-nosotros": { language: "es", alternatives: { en: "https://en.panamalegallab.com/about-us", fr: "https://fr.panamalegallab.com/a-propos", it: "https://it.panamalegallab.com/chi-siamo" } }, "https://en.panamalegallab.com/about-us": { language: "en", alternatives: { es: "https://www.panamalegallab.com/sobre-nosotros", fr: "https://fr.panamalegallab.com/a-propos", it: "https://it.panamalegallab.com/chi-siamo" } }, "https://fr.panamalegallab.com/a-propos": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/sobre-nosotros", en: "https://en.panamalegallab.com/about-us", it: "https://it.panamalegallab.com/chi-siamo" } }, "https://it.panamalegallab.com/chi-siamo": { language: "it", alternatives: { es: "https://www.panamalegallab.com/sobre-nosotros", en: "https://en.panamalegallab.com/about-us", fr: "https://fr.panamalegallab.com/a-propos" } }, "https://www.panamalegallab.com/contacto": { language: "es", alternatives: { en: "https://en.panamalegallab.com/contact-us", fr: "https://fr.panamalegallab.com/contactez-nous", it: "https://it.panamalegallab.com/contatto" } }, "https://en.panamalegallab.com/contact-us": { language: "en", alternatives: { es: "https://www.panamalegallab.com/contacto", fr: "https://fr.panamalegallab.com/contactez-nous", it: "https://it.panamalegallab.com/contatto" } }, "https://fr.panamalegallab.com/contactez-nous": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/contacto", en: "https://en.panamalegallab.com/contact-us", it: "https://it.panamalegallab.com/contatto" } }, "https://it.panamalegallab.com/contatto": { language: "it", alternatives: { es: "https://www.panamalegallab.com/contacto", en: "https://en.panamalegallab.com/contact-us", fr: "https://fr.panamalegallab.com/contactez-nous" } }, "https://www.panamalegallab.com/aviso-legal-politica-privacidad": { language: "es", alternatives: { en: "https://en.panamalegallab.com/legal-notice-privacy-policy", fr: "https://fr.panamalegallab.com/mentions-legales-politique-confidentialite", it: "https://it.panamalegallab.com/note-legali-informativa-privacy" } }, "https://en.panamalegallab.com/legal-notice-privacy-policy": { language: "en", alternatives: { es: "https://www.panamalegallab.com/aviso-legal-politica-privacidad", fr: "https://fr.panamalegallab.com/mentions-legales-politique-confidentialite", it: "https://it.panamalegallab.com/note-legali-informativa-privacy" } }, "https://fr.panamalegallab.com/mentions-legales-politique-confidentialite": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/aviso-legal-politica-privacidad", en: "https://en.panamalegallab.com/legal-notice-privacy-policy", it: "https://it.panamalegallab.com/note-legali-informativa-privacy" } }, "https://it.panamalegallab.com/note-legali-informativa-privacy": { language: "it", alternatives: { es: "https://www.panamalegallab.com/aviso-legal-politica-privacidad", en: "https://en.panamalegallab.com/legal-notice-privacy-policy", fr: "https://fr.panamalegallab.com/mentions-legales-politique-confidentialite" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/sa-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/sa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/sa-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/sa-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/srl-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/srl-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/srl-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/srl-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/fondazione-di-interesse-privato-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/fundaci%C3%B3n-inter%C3%A9s-privado-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/private-interest-foundation", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/fondation-dint%C3%A9r%C3%AAt-priv%C3%A9-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/affari-internazionali": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/negocios-internacional", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/business-international", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/affaire-international" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/operativa-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/operating-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/op%C3%A9rationnelle-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale" } }, "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale" } }, "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/creazione-impresa-a-panama/ufficio-virtuale": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/crear-empresa-en-panama/operativa-oficina-virtual", en: "https://en.panamalegallab.com/our-services-in-panama/start-business-in-panama/virtual-office", fr: "https://fr.panamalegallab.com/nos-services-au-panama/creer-entreprise-au-panama/bureau-virtuel" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-personale-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-personal-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/personal-bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-personnel-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/conto-bancario-a-panama/conto-bancario-impresa-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/cuenta-bancaria-en-panama/cuenta-bancaria-corporativa-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/bank-account-in-panama/corporate-bank-account-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/compte-bancaire-au-panama/compte-bancaire-corporatif-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/paesi-amici": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-paises-amigos-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/friendly-nations-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-pays-amicaux-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/visto-investitore": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-inversionista-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/investor-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-Investisseur-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/pensionato": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-jubilados-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/retiree-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-retraite-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/ricongiungimento-familiare": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-familiar-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/family-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-familial-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/professionisti": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/visado-profesional-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/professional-visa", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/visa-professionnels-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/studenti": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-educativo-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/student-permit", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etudiant-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/straniero-10": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-extranjero-10-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/foreign-worker-10", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-etrangers-10-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/tecnico-15": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/permiso-tecnico-15-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/technical-permit-15", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/permis-technique-15-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali" } }, "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali" } }, "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/residenza-a-panama/sede-multinazionali": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/residencia-en-panama/sede-multinacionales-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/residence-in-panama/multinational-headquarters", fr: "https://fr.panamalegallab.com/nos-services-au-panama/residence-au-panama/sieges-multinationaux-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-grandbay-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-grandbay-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-grandbay-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-grandbay-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-start-herald-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-start-herald-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-start-herald-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-start-herald-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-piazza-cattedrale-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-plaza-catedral-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-catedral-square-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-ph-place-cathedrale-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama" } }, "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama" } }, "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama", it: "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-panama/investimento-immobiliare-a-panama/immobile-investimento-ph-commerciale-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-panama/inversion-inmobiliaria-en-panama/inmueble-inversion-ph-local-comercial-en-panama", en: "https://en.panamalegallab.com/our-services-in-panama/real-estate-investment-in-panama/investment-property-ph-commercial-space-in-panama", fr: "https://fr.panamalegallab.com/nos-services-au-panama/investissement-immobilier-au-panama/bien-investissement-commerciaux-au-panama" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna" } }, "https://en.panamalegallab.com/our-services-in-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna" } }, "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/residenza-in-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/residencia-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain/residency-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/residence-en-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/spanish-citizenship-by-residence", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-espagnole-par-residence", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza" } }, "https://en.panamalegallab.com/our-services-in-spain/spanish-citizenship-by-residence": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-espagnole-par-residence", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-espagnole-par-residence": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia", en: "https://en.panamalegallab.com/our-services-in-spain/spanish-citizenship-by-residence", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/cittadinanza-spagnola-per-residenza": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-espanola-por-residencia", en: "https://en.panamalegallab.com/our-services-in-spain/spanish-citizenship-by-residence", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-espagnole-par-residence" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia" } }, "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana", en: "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/opzione-famiglia": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/nacionalidad-por-opcion-vias-familiares-espana", en: "https://en.panamalegallab.com/our-services-in-spain/nationality-by-option-family-routes-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/nationalite-par-option-voies-familiales-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole" } }, "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol", en: "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ricerca-origini-spagnole": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/investigacion-origen-espanol", en: "https://en.panamalegallab.com/our-services-in-spain/spanish-ancestry-research", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/recherche-origines-espagnoles" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna" } }, "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/ottenimento-di-atti-e-certificati-in-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/obtencion-de-partidas-y-certificados-en-espana", en: "https://en.panamalegallab.com/our-services-in-spain/obtaining-records-and-certificates-in-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/obtention-actes-et-certificats-en-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate" } }, "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana", en: "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/lmd-pratiche-avviate": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/expedientes-lmd-iniciados-espana", en: "https://en.panamalegallab.com/our-services-in-spain/ongoing-lmd-applications-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/dossiers-lmd-deja-engages-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento" } }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama" } }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-canyelles-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-canyelles", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-canyelles-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-canyelles-spagne" } }, "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera": { language: "es", alternatives: { en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna" } }, "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna" } }, "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain", it: "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna" } }, "https://it.panamalegallab.com/i-nostri-servizi-a-spagna/insediamento-investimento/immobile-investimento-llagostera-a-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/nuestros-servicios-en-espana/establecimiento-e-inversion-espana/inmueble-inversi%C3%B3n-llagostera", en: "https://en.panamalegallab.com/our-services-in-spain/business-setup-investment-spain/investment-property-llagostera-spain", fr: "https://fr.panamalegallab.com/nos-Services-au-espagne/creation-activite-investissement-espagne/bien-investissement-llagostera-espagne" } }, "https://www.panamalegallab.com/guia-de-recursos": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub", fr: "https://fr.panamalegallab.com/guide-de-ressources", it: "https://it.panamalegallab.com/guida-risorse" } }, "https://en.panamalegallab.com/resource-hub": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos", fr: "https://fr.panamalegallab.com/guide-de-ressources", it: "https://it.panamalegallab.com/guida-risorse" } }, "https://fr.panamalegallab.com/guide-de-ressources": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos", en: "https://en.panamalegallab.com/resource-hub", it: "https://it.panamalegallab.com/guida-risorse" } }, "https://it.panamalegallab.com/guida-risorse": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos", en: "https://en.panamalegallab.com/resource-hub", fr: "https://fr.panamalegallab.com/guide-de-ressources" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/tipos-de-sociedades-opciones-para-ejercer-actividades-comerciales": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/types-of-companies-for-conducting-commercial-activities", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/types-de-soci%C3%A9t%C3%A9s-options-pour-exercer-des-activit%C3%A9s-commerciales", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/tipi-di-societ%C3%A0-opzioni-per-svolgere-attivit%C3%A0-commerciali" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/types-of-companies-for-conducting-commercial-activities": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/tipos-de-sociedades-opciones-para-ejercer-actividades-comerciales", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/types-de-soci%C3%A9t%C3%A9s-options-pour-exercer-des-activit%C3%A9s-commerciales", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/tipi-di-societ%C3%A0-opzioni-per-svolgere-attivit%C3%A0-commerciali" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/types-de-soci%C3%A9t%C3%A9s-options-pour-exercer-des-activit%C3%A9s-commerciales": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/tipos-de-sociedades-opciones-para-ejercer-actividades-comerciales", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/types-of-companies-for-conducting-commercial-activities", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/tipi-di-societ%C3%A0-opzioni-per-svolgere-attivit%C3%A0-commerciali" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/tipi-di-societ%C3%A0-opzioni-per-svolgere-attivit%C3%A0-commerciali": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/tipos-de-sociedades-opciones-para-ejercer-actividades-comerciales", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/types-of-companies-for-conducting-commercial-activities", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/types-de-soci%C3%A9t%C3%A9s-options-pour-exercer-des-activit%C3%A9s-commerciales" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/requisitos-para-el-registro-de-una-sociedad-en-panam%C3%A1": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/requirements-for-registering-a-company-in-panama", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/exigences-pour-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/requisiti-per-la-registrazione-di-una-societ%C3%A0-a-panama" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/requirements-for-registering-a-company-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/requisitos-para-el-registro-de-una-sociedad-en-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/exigences-pour-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/requisiti-per-la-registrazione-di-una-societ%C3%A0-a-panama" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/exigences-pour-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/requisitos-para-el-registro-de-una-sociedad-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/requirements-for-registering-a-company-in-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/requisiti-per-la-registrazione-di-una-societ%C3%A0-a-panama" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/requisiti-per-la-registrazione-di-una-societ%C3%A0-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/requisitos-para-el-registro-de-una-sociedad-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/requirements-for-registering-a-company-in-panama", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/exigences-pour-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/atractivo-del-registro": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/the-appeal-of-registering-a-company-in-panama", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/lattrait-de-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/il-fascino-della-registrazione-delle-societ%C3%A0-a-panama" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/the-appeal-of-registering-a-company-in-panama": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/atractivo-del-registro", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/lattrait-de-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/il-fascino-della-registrazione-delle-societ%C3%A0-a-panama" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/lattrait-de-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/atractivo-del-registro", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/the-appeal-of-registering-a-company-in-panama", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/il-fascino-della-registrazione-delle-societ%C3%A0-a-panama" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/il-fascino-della-registrazione-delle-societ%C3%A0-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/atractivo-del-registro", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/the-appeal-of-registering-a-company-in-panama", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/lattrait-de-lenregistrement-dune-soci%C3%A9t%C3%A9-au-panama" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-a-vs-s-r-l-en-panam%C3%A1": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-a-vs-s-r-l-in-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-a-vs-s-r-l-au-panam%C3%A1", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-a-vs-s-r-l-a-panama" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-a-vs-s-r-l-in-panam%C3%A1": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-a-vs-s-r-l-en-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-a-vs-s-r-l-au-panam%C3%A1", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-a-vs-s-r-l-a-panama" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-a-vs-s-r-l-au-panam%C3%A1": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-a-vs-s-r-l-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-a-vs-s-r-l-in-panam%C3%A1", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-a-vs-s-r-l-a-panama" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-a-vs-s-r-l-a-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-a-vs-s-r-l-en-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-a-vs-s-r-l-in-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-a-vs-s-r-l-au-panam%C3%A1" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-r-l-y-otras-figuras-jur%C3%ADdicas": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-r-l-and-other-legal-entities", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-r-l-et-autres-formes-juridiques", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-r-l-e-altre-figure-giuridiche" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-r-l-and-other-legal-entities": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-r-l-y-otras-figuras-jur%C3%ADdicas", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-r-l-et-autres-formes-juridiques", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-r-l-e-altre-figure-giuridiche" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-r-l-et-autres-formes-juridiques": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-r-l-y-otras-figuras-jur%C3%ADdicas", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-r-l-and-other-legal-entities", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-r-l-e-altre-figure-giuridiche" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-s-r-l-e-altre-figure-giuridiche": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-s-r-l-y-otras-figuras-jur%C3%ADdicas", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-s-r-l-and-other-legal-entities", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-s-r-l-et-autres-formes-juridiques" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedades-an%C3%B3nimas-operativas-y-no-operativas": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-operating-and-non-operating-anonymous-corporation", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparative-operating-and-non-operating-public-limited-companies", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-anonime-operative-e-non-operative" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-operating-and-non-operating-anonymous-corporation": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedades-an%C3%B3nimas-operativas-y-no-operativas", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparative-operating-and-non-operating-public-limited-companies", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-anonime-operative-e-non-operative" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparative-operating-and-non-operating-public-limited-companies": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedades-an%C3%B3nimas-operativas-y-no-operativas", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-operating-and-non-operating-anonymous-corporation", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-anonime-operative-e-non-operative" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-anonime-operative-e-non-operative": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedades-an%C3%B3nimas-operativas-y-no-operativas", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-operating-and-non-operating-anonymous-corporation", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparative-operating-and-non-operating-public-limited-companies" } }, "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedad-extranjera-s-a-y-redomiciliaci%C3%B3n": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-foreign-company-s-a-and-redomiciliation", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-soci%C3%A9t%C3%A9-%C3%A9trang%C3%A8re-s-a-et-redomiciliation", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-straniera-s-a-e-redomiciliazione" } }, "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-foreign-company-s-a-and-redomiciliation": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedad-extranjera-s-a-y-redomiciliaci%C3%B3n", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-soci%C3%A9t%C3%A9-%C3%A9trang%C3%A8re-s-a-et-redomiciliation", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-straniera-s-a-e-redomiciliazione" } }, "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-soci%C3%A9t%C3%A9-%C3%A9trang%C3%A8re-s-a-et-redomiciliation": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedad-extranjera-s-a-y-redomiciliaci%C3%B3n", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-foreign-company-s-a-and-redomiciliation", it: "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-straniera-s-a-e-redomiciliazione" } }, "https://it.panamalegallab.com/guida-risorse/registro-e-tipi-di-societ%C3%A0-a-panama/confronto-societ%C3%A0-straniera-s-a-e-redomiciliazione": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/registro-y-tipos-de-sociedades-en-panam%C3%A1/comparativa-sociedad-extranjera-s-a-y-redomiciliaci%C3%B3n", en: "https://en.panamalegallab.com/resource-hub/registration-and-types-of-companies/comparative-foreign-company-s-a-and-redomiciliation", fr: "https://fr.panamalegallab.com/guide-de-ressources/cr%C3%A9ation-et-types-de-soci%C3%A9t%C3%A9s/comparatif-soci%C3%A9t%C3%A9-%C3%A9trang%C3%A8re-s-a-et-redomiciliation" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/diferencias-accionistas-y-directores-en-las-sociedades-an%C3%B3nimas-de-panam%C3%A1": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/differences-shareholders-and-directors-in-anonymous-corporation-in-pana", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/diff%C3%A9rences-actionnaires-et-administrateurs-dans-les-soci%C3%A9t%C3%A9s-anonymes", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/differenze-azionisti-e-direttori-nelle-societ%C3%A0-anonime-di-panama" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/differences-shareholders-and-directors-in-anonymous-corporation-in-pana": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/diferencias-accionistas-y-directores-en-las-sociedades-an%C3%B3nimas-de-panam%C3%A1", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/diff%C3%A9rences-actionnaires-et-administrateurs-dans-les-soci%C3%A9t%C3%A9s-anonymes", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/differenze-azionisti-e-direttori-nelle-societ%C3%A0-anonime-di-panama" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/diff%C3%A9rences-actionnaires-et-administrateurs-dans-les-soci%C3%A9t%C3%A9s-anonymes": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/diferencias-accionistas-y-directores-en-las-sociedades-an%C3%B3nimas-de-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/differences-shareholders-and-directors-in-anonymous-corporation-in-pana", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/differenze-azionisti-e-direttori-nelle-societ%C3%A0-anonime-di-panama" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/differenze-azionisti-e-direttori-nelle-societ%C3%A0-anonime-di-panama": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/diferencias-accionistas-y-directores-en-las-sociedades-an%C3%B3nimas-de-panam%C3%A1", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/differences-shareholders-and-directors-in-anonymous-corporation-in-pana", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/diff%C3%A9rences-actionnaires-et-administrateurs-dans-les-soci%C3%A9t%C3%A9s-anonymes" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/capital-social-sociedad-an%C3%B3nima-paname%C3%B1a": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/share-capital-panamanian-anonymous-corporation", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/capital-social-soci%C3%A9t%C3%A9-anonyme-panam%C3%A9enne", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/capitale-sociale-societ%C3%A0-anonima-panamense" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/share-capital-panamanian-anonymous-corporation": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/capital-social-sociedad-an%C3%B3nima-paname%C3%B1a", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/capital-social-soci%C3%A9t%C3%A9-anonyme-panam%C3%A9enne", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/capitale-sociale-societ%C3%A0-anonima-panamense" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/capital-social-soci%C3%A9t%C3%A9-anonyme-panam%C3%A9enne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/capital-social-sociedad-an%C3%B3nima-paname%C3%B1a", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/share-capital-panamanian-anonymous-corporation", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/capitale-sociale-societ%C3%A0-anonima-panamense" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/capitale-sociale-societ%C3%A0-anonima-panamense": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/capital-social-sociedad-an%C3%B3nima-paname%C3%B1a", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/share-capital-panamanian-anonymous-corporation", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/capital-social-soci%C3%A9t%C3%A9-anonyme-panam%C3%A9enne" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/comparativa-acciones-nominativas-frente-a-las-acciones-al-portador": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/comparative-registered-shares-vs-bearer-shares", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/comparatif-actions-nominatives-vs-actions-au-porteur", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/confronto-azioni-nominative-vs-azioni-al-portatore" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/comparative-registered-shares-vs-bearer-shares": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/comparativa-acciones-nominativas-frente-a-las-acciones-al-portador", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/comparatif-actions-nominatives-vs-actions-au-porteur", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/confronto-azioni-nominative-vs-azioni-al-portatore" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/comparatif-actions-nominatives-vs-actions-au-porteur": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/comparativa-acciones-nominativas-frente-a-las-acciones-al-portador", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/comparative-registered-shares-vs-bearer-shares", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/confronto-azioni-nominative-vs-azioni-al-portatore" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/confronto-azioni-nominative-vs-azioni-al-portatore": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/comparativa-acciones-nominativas-frente-a-las-acciones-al-portador", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/comparative-registered-shares-vs-bearer-shares", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/comparatif-actions-nominatives-vs-actions-au-porteur" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/debo-escoger-el-servicio-de-directores-nominales-al-crear-una-s-a": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/should-i-choose-the-nominee-directors-service-when-incorporating-a-s-a", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/dois-je-choisir-le-service-de-directeurs-nominaux-lors-de-la-cr%C3%A9ation-s-a", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/devo-scegliere-il-servizio-di-direttori-nominali-nella-creazione-di-una-s-a" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/should-i-choose-the-nominee-directors-service-when-incorporating-a-s-a": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/debo-escoger-el-servicio-de-directores-nominales-al-crear-una-s-a", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/dois-je-choisir-le-service-de-directeurs-nominaux-lors-de-la-cr%C3%A9ation-s-a", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/devo-scegliere-il-servizio-di-direttori-nominali-nella-creazione-di-una-s-a" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/dois-je-choisir-le-service-de-directeurs-nominaux-lors-de-la-cr%C3%A9ation-s-a": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/debo-escoger-el-servicio-de-directores-nominales-al-crear-una-s-a", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/should-i-choose-the-nominee-directors-service-when-incorporating-a-s-a", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/devo-scegliere-il-servizio-di-direttori-nominali-nella-creazione-di-una-s-a" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/devo-scegliere-il-servizio-di-direttori-nominali-nella-creazione-di-una-s-a": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/debo-escoger-el-servicio-de-directores-nominales-al-crear-una-s-a", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/should-i-choose-the-nominee-directors-service-when-incorporating-a-s-a", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/dois-je-choisir-le-service-de-directeurs-nominaux-lors-de-la-cr%C3%A9ation-s-a" } }, "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/directores-nominales-procedimiento-para-uso-del-documento-de-renuncia": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/nominee-directors-procedure-for-the-use-of-the-resignation-letter", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/directeurs-nominaux-proc%C3%A9dure-dutilisation-du-document-de-d%C3%A9mission", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/direttori-nominali-procedura-per-luso-del-documento-di-dimissioni" } }, "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/nominee-directors-procedure-for-the-use-of-the-resignation-letter": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/directores-nominales-procedimiento-para-uso-del-documento-de-renuncia", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/directeurs-nominaux-proc%C3%A9dure-dutilisation-du-document-de-d%C3%A9mission", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/direttori-nominali-procedura-per-luso-del-documento-di-dimissioni" } }, "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/directeurs-nominaux-proc%C3%A9dure-dutilisation-du-document-de-d%C3%A9mission": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/directores-nominales-procedimiento-para-uso-del-documento-de-renuncia", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/nominee-directors-procedure-for-the-use-of-the-resignation-letter", it: "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/direttori-nominali-procedura-per-luso-del-documento-di-dimissioni" } }, "https://it.panamalegallab.com/guida-risorse/azionisti-direttori-e-capitale/direttori-nominali-procedura-per-luso-del-documento-di-dimissioni": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/accionistas-directores-y-capital/directores-nominales-procedimiento-para-uso-del-documento-de-renuncia", en: "https://en.panamalegallab.com/resource-hub/shareholders-directors-and-capital/nominee-directors-procedure-for-the-use-of-the-resignation-letter", fr: "https://fr.panamalegallab.com/guide-de-ressources/actionnaires-administrateurs-et-capital/directeurs-nominaux-proc%C3%A9dure-dutilisation-du-document-de-d%C3%A9mission" } }, "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust" } }, "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust" } }, "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust" } }, "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies" } }, "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/comparativa-sociedades-an%C3%B3nimas-vs-fundaciones-inter%C3%A9s-privado": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/comparative-corporations-vs-private-interest-foundations", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/comparatif-soci%C3%A9t%C3%A9s-anonymes-vs-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/confronto-societ%C3%A0-anonime-vs-fondazioni-di-interesse-privato" } }, "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/comparative-corporations-vs-private-interest-foundations": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/comparativa-sociedades-an%C3%B3nimas-vs-fundaciones-inter%C3%A9s-privado", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/comparatif-soci%C3%A9t%C3%A9s-anonymes-vs-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/confronto-societ%C3%A0-anonime-vs-fondazioni-di-interesse-privato" } }, "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/comparatif-soci%C3%A9t%C3%A9s-anonymes-vs-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/comparativa-sociedades-an%C3%B3nimas-vs-fundaciones-inter%C3%A9s-privado", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/comparative-corporations-vs-private-interest-foundations", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/confronto-societ%C3%A0-anonime-vs-fondazioni-di-interesse-privato" } }, "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/confronto-societ%C3%A0-anonime-vs-fondazioni-di-interesse-privato": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/comparativa-sociedades-an%C3%B3nimas-vs-fundaciones-inter%C3%A9s-privado", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/comparative-corporations-vs-private-interest-foundations", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/comparatif-soci%C3%A9t%C3%A9s-anonymes-vs-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9" } }, "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/distinciones-legales-fundaciones-de-inter%C3%A9s-privado-vs-fideicomisos": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/legal-distinctions-private-interest-foundations-vs-trusts", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/distinctions-juridiques-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-vs-fiducies", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/distinzioni-giuridiche-fondazioni-di-interesse-privato-vs-trust" } }, "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/legal-distinctions-private-interest-foundations-vs-trusts": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/distinciones-legales-fundaciones-de-inter%C3%A9s-privado-vs-fideicomisos", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/distinctions-juridiques-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-vs-fiducies", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/distinzioni-giuridiche-fondazioni-di-interesse-privato-vs-trust" } }, "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/distinctions-juridiques-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-vs-fiducies": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/distinciones-legales-fundaciones-de-inter%C3%A9s-privado-vs-fideicomisos", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/legal-distinctions-private-interest-foundations-vs-trusts", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/distinzioni-giuridiche-fondazioni-di-interesse-privato-vs-trust" } }, "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/distinzioni-giuridiche-fondazioni-di-interesse-privato-vs-trust": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/distinciones-legales-fundaciones-de-inter%C3%A9s-privado-vs-fideicomisos", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/legal-distinctions-private-interest-foundations-vs-trusts", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/distinctions-juridiques-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-vs-fiducies" } }, "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9n-administra-las-fundaciones-de-inter%C3%A9s-privado-y-c%C3%B3mo-se-manejan": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-administers-private-interest-foundations-and-how-are-they-managed", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-administre-les-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-et-comment-sont-elles-g%C3%A9r%C3%A9es", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-amministra-le-fondazioni-di-interesse-privato-e-come-vengono-gestite" } }, "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-administers-private-interest-foundations-and-how-are-they-managed": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9n-administra-las-fundaciones-de-inter%C3%A9s-privado-y-c%C3%B3mo-se-manejan", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-administre-les-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-et-comment-sont-elles-g%C3%A9r%C3%A9es", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-amministra-le-fondazioni-di-interesse-privato-e-come-vengono-gestite" } }, "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-administre-les-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-et-comment-sont-elles-g%C3%A9r%C3%A9es": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9n-administra-las-fundaciones-de-inter%C3%A9s-privado-y-c%C3%B3mo-se-manejan", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-administers-private-interest-foundations-and-how-are-they-managed", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-amministra-le-fondazioni-di-interesse-privato-e-come-vengono-gestite" } }, "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-amministra-le-fondazioni-di-interesse-privato-e-come-vengono-gestite": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9n-administra-las-fundaciones-de-inter%C3%A9s-privado-y-c%C3%B3mo-se-manejan", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-administers-private-interest-foundations-and-how-are-they-managed", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-administre-les-fondations-dint%C3%A9r%C3%AAt-priv%C3%A9-et-comment-sont-elles-g%C3%A9r%C3%A9es" } }, "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9nes-pueden-ser-beneficiarios-de-una-fundaci%C3%B3n-de-inter%C3%A9s-privado": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-can-be-beneficiaries-of-a-private-interest-foundation", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-peut-%C3%AAtre-b%C3%A9n%C3%A9ficiaire-dune-fondation-dint%C3%A9r%C3%AAt-priv%C3%A9", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-pu%C3%B2-essere-beneficiario-di-una-fondazione-di-interesse-privato" } }, "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-can-be-beneficiaries-of-a-private-interest-foundation": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9nes-pueden-ser-beneficiarios-de-una-fundaci%C3%B3n-de-inter%C3%A9s-privado", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-peut-%C3%AAtre-b%C3%A9n%C3%A9ficiaire-dune-fondation-dint%C3%A9r%C3%AAt-priv%C3%A9", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-pu%C3%B2-essere-beneficiario-di-una-fondazione-di-interesse-privato" } }, "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-peut-%C3%AAtre-b%C3%A9n%C3%A9ficiaire-dune-fondation-dint%C3%A9r%C3%AAt-priv%C3%A9": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9nes-pueden-ser-beneficiarios-de-una-fundaci%C3%B3n-de-inter%C3%A9s-privado", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-can-be-beneficiaries-of-a-private-interest-foundation", it: "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-pu%C3%B2-essere-beneficiario-di-una-fondazione-di-interesse-privato" } }, "https://it.panamalegallab.com/guida-risorse/fondazioni-e-trust/chi-pu%C3%B2-essere-beneficiario-di-una-fondazione-di-interesse-privato": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/fundaciones-y-fideicomisos/qui%C3%A9nes-pueden-ser-beneficiarios-de-una-fundaci%C3%B3n-de-inter%C3%A9s-privado", en: "https://en.panamalegallab.com/resource-hub/for-your-foundations-and-trusts/who-can-be-beneficiaries-of-a-private-interest-foundation", fr: "https://fr.panamalegallab.com/guide-de-ressources/pour-vos-fondations-et-fiducies/qui-peut-%C3%AAtre-b%C3%A9n%C3%A9ficiaire-dune-fondation-dint%C3%A9r%C3%AAt-priv%C3%A9" } }, "https://www.panamalegallab.com/guia-de-recursos/como-buscar-partida-abuelo-espanol-sin-conocer-municipio": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/how-to-find-spanish-grandfathers-birth-record-without-knowing-municipality", fr: "https://fr.panamalegallab.com/guide-de-ressources/comment-retrouver-acte-naissance-grand-pere-espagnol-sans-connaitre-commune", it: "https://it.panamalegallab.com/guida-risorse/come-trovare-atto-nascita-nonno-spagnolo-senza-conoscere-comune" } }, "https://en.panamalegallab.com/resource-hub/how-to-find-spanish-grandfathers-birth-record-without-knowing-municipality": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/como-buscar-partida-abuelo-espanol-sin-conocer-municipio", fr: "https://fr.panamalegallab.com/guide-de-ressources/comment-retrouver-acte-naissance-grand-pere-espagnol-sans-connaitre-commune", it: "https://it.panamalegallab.com/guida-risorse/come-trovare-atto-nascita-nonno-spagnolo-senza-conoscere-comune" } }, "https://fr.panamalegallab.com/guide-de-ressources/comment-retrouver-acte-naissance-grand-pere-espagnol-sans-connaitre-commune": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/como-buscar-partida-abuelo-espanol-sin-conocer-municipio", en: "https://en.panamalegallab.com/resource-hub/how-to-find-spanish-grandfathers-birth-record-without-knowing-municipality", it: "https://it.panamalegallab.com/guida-risorse/come-trovare-atto-nascita-nonno-spagnolo-senza-conoscere-comune" } }, "https://it.panamalegallab.com/guida-risorse/come-trovare-atto-nascita-nonno-spagnolo-senza-conoscere-comune": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/como-buscar-partida-abuelo-espanol-sin-conocer-municipio", en: "https://en.panamalegallab.com/resource-hub/how-to-find-spanish-grandfathers-birth-record-without-knowing-municipality", fr: "https://fr.panamalegallab.com/guide-de-ressources/comment-retrouver-acte-naissance-grand-pere-espagnol-sans-connaitre-commune" } }, "https://www.panamalegallab.com/guia-de-recursos/guia-nacionalidad-espanola-por-residencia": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/guide-citizenship-by-residence-spain", fr: "https://fr.panamalegallab.com/guide-de-ressources/guide-nationalite-par-residence-espagne", it: "https://it.panamalegallab.com/guida-risorse/guida-cittadinanza-per-residenza-spagna" } }, "https://en.panamalegallab.com/resource-hub/guide-citizenship-by-residence-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/guia-nacionalidad-espanola-por-residencia", fr: "https://fr.panamalegallab.com/guide-de-ressources/guide-nationalite-par-residence-espagne", it: "https://it.panamalegallab.com/guida-risorse/guida-cittadinanza-per-residenza-spagna" } }, "https://fr.panamalegallab.com/guide-de-ressources/guide-nationalite-par-residence-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/guia-nacionalidad-espanola-por-residencia", en: "https://en.panamalegallab.com/resource-hub/guide-citizenship-by-residence-spain", it: "https://it.panamalegallab.com/guida-risorse/guida-cittadinanza-per-residenza-spagna" } }, "https://it.panamalegallab.com/guida-risorse/guida-cittadinanza-per-residenza-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/guia-nacionalidad-espanola-por-residencia", en: "https://en.panamalegallab.com/resource-hub/guide-citizenship-by-residence-spain", fr: "https://fr.panamalegallab.com/guide-de-ressources/guide-nationalite-par-residence-espagne" } }, "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados-espana": { language: "es", alternatives: { en: "https://en.panamalegallab.com/resource-hub/types-of-certificates-spain", fr: "https://fr.panamalegallab.com/guide-de-ressources/types-de-certificats-espagne", it: "https://it.panamalegallab.com/guida-risorse/tipi-di-certificati-spagna" } }, "https://en.panamalegallab.com/resource-hub/types-of-certificates-spain": { language: "en", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados-espana", fr: "https://fr.panamalegallab.com/guide-de-ressources/types-de-certificats-espagne", it: "https://it.panamalegallab.com/guida-risorse/tipi-di-certificati-spagna" } }, "https://fr.panamalegallab.com/guide-de-ressources/types-de-certificats-espagne": { language: "fr", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados-espana", en: "https://en.panamalegallab.com/resource-hub/types-of-certificates-spain", it: "https://it.panamalegallab.com/guida-risorse/tipi-di-certificati-spagna" } }, "https://it.panamalegallab.com/guida-risorse/tipi-di-certificati-spagna": { language: "it", alternatives: { es: "https://www.panamalegallab.com/guia-de-recursos/tipos-certificados-espana", en: "https://en.panamalegallab.com/resource-hub/types-of-certificates-spain", fr: "https://fr.panamalegallab.com/guide-de-ressources/types-de-certificats-espagne" } } } };

// renderer/src/production-canary.js
var CANARY_ORIGIN = "https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev";
function isProductionCanary(plan) {
  return plan.mode === "preview" && plan.indexable === false && plan.previewOrigin === CANARY_ORIGIN;
}
function usesProductionRendering(plan) {
  return plan.mode === "production" || isProductionCanary(plan);
}

// renderer/src/readiness.js
var descriptions = Object.freeze(Object.fromEntries(Object.entries(readiness_default.descriptions).map(([url, row]) => [url, Object.freeze({ ...row })])));
var links = Object.freeze(Object.fromEntries(Object.entries(readiness_default.languageLinks).map(([url, row]) => [url, Object.freeze({ ...row, alternatives: Object.freeze({ ...row.alternatives }) })])));
var DATA = Object.freeze({ descriptions, languageLinks: links });
var HOME_ALIASES2 = Object.freeze({ es: "/inicio", en: "/home", fr: "/accueil", it: "/inizio" });
function selectReadinessPolicy(plan, data = DATA) {
  const productionPolicy = plan.mode === "production" && plan.indexable === true || isProductionCanary(plan);
  if (plan.kind !== "page" || !productionPolicy || plan.searchPage || plan.canonical !== `${plan.site?.productionOrigin}${plan.path}` && !(plan.canonical === `${plan.site?.productionOrigin}/` && plan.path === HOME_ALIASES2[plan.site.language])) return null;
  const row = data.languageLinks[plan.canonical];
  if (!row || row.language !== plan.site.language) return null;
  const description = data.descriptions[plan.canonical];
  if (description && description.language !== row.language) return null;
  return Object.freeze({
    language: row.language,
    alternatives: row.alternatives,
    description: description?.text ?? null
  });
}
function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "&#39;");
}
function descriptionTag(policy, context) {
  return policy?.description && context?.siteLanguage === policy.language ? `<meta name="description" content="${escapeAttribute(policy.description)}">` : "";
}

// renderer/src/header-language-controls.js
var scopes = ["yuynLe", "WDxLfe"].map((id) => `header#atIdViewHeader nav#${id}`);
var HEADER_NAV = scopes.join(",");
var HEADER_ANCHOR = scopes.map((scope) => `${scope} a`).join(",");
var HEADER_DESCENDANT = scopes.map((scope) => `${scope} a *`).join(",");
var ROOT_LANGUAGES = Object.freeze(Object.fromEntries(Object.values(SITES).flatMap((site) => [[site.productionOrigin, site.language], [site.productionOrigin + "/", site.language]])));
var LABELS = Object.freeze({
  es: { title: "\u{1F310} Idiomas", en: "\u{1F1FA}\u{1F1F8} Ingl\xE9s", fr: "\u{1F1EB}\u{1F1F7} Franc\xE9s", it: "\u{1F1EE}\u{1F1F9} Italiano" },
  en: { title: "\u{1F310} Languages", es: "\u{1F1EA}\u{1F1F8} Spanish", fr: "\u{1F1EB}\u{1F1F7} French", it: "\u{1F1EE}\u{1F1F9} Italian" },
  fr: { title: "\u{1F310} Langues", es: "\u{1F1EA}\u{1F1F8} Espagnol", en: "\u{1F1FA}\u{1F1F8} Anglais", it: "\u{1F1EE}\u{1F1F9} Italien" },
  it: { title: "\u{1F310} Lingue", es: "\u{1F1EA}\u{1F1F8} Spagnolo", en: "\u{1F1FA}\u{1F1F8} Inglese", fr: "\u{1F1EB}\u{1F1F7} Francese" }
});
var textValue = (value) => value.replace(/\s+/gu, " ").trim();
function rootLanguage(value) {
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f\\]/u.test(value)) return null;
  if (Object.hasOwn(ROOT_LANGUAGES, value)) return ROOT_LANGUAGES[value];
  if (!value.startsWith("https://www.google.com/url?") || value.includes("#")) return null;
  let wrapper;
  try {
    wrapper = new URL(value);
  } catch {
    return null;
  }
  if (wrapper.origin !== "https://www.google.com" || wrapper.pathname !== "/url" || wrapper.username || wrapper.password || wrapper.port || wrapper.hash) return null;
  const targets = wrapper.searchParams.getAll("q");
  if (targets.length !== 1 || !Object.hasOwn(ROOT_LANGUAGES, targets[0])) return null;
  return ROOT_LANGUAGES[targets[0]];
}
function createRootClassifier() {
  let cache = /* @__PURE__ */ new Map();
  let characters = 0;
  return (value) => {
    if (cache.has(value)) return cache.get(value);
    const language = rootLanguage(value);
    if (typeof value === "string" && value.length <= 2048 && cache.size < 32 && characters + value.length <= 32768) {
      cache = new Map([...cache, [value, language]]);
      characters += value.length;
    }
    return language;
  };
}
function levelOf(element) {
  const level = element.getAttribute("data-level");
  return ["1", "2", "3"].includes(level) ? Number(level) : NaN;
}
function hasMedia(element) {
  const style = element.getAttribute("style") ?? "";
  return style.includes("\\") || ["src", "srcset", "poster", "background", "data", "data-src"].some((name) => element.getAttribute(name) !== null) || /(?:url\s*\(|(?:background(?:-image)?|mask(?:-image)?|content)\s*:)/iu.test(style);
}
function readAnchor(element, ordinal, level = levelOf(element), navType = element.getAttribute("data-navtype")) {
  return {
    ordinal,
    text: "",
    level,
    href: element.getAttribute("href"),
    dataUrl: element.getAttribute("data-url"),
    navType,
    type: element.getAttribute("data-type"),
    popup: element.getAttribute("aria-haspopup"),
    more: element.getAttribute("data-in-more-submenu"),
    valid: element.getAttribute("jsname") === "QwLHlb" && element.getAttribute("role") === "link" && (element.getAttribute("class") ?? "").split(/\s+/u).includes("aJHbb") && !hasMedia(element)
  };
}
function isParent(anchor, nav, locale) {
  return anchor.valid && LABELS[locale] && textValue(anchor.text) === LABELS[locale].title && anchor.navType === "4" && anchor.type === null && anchor.popup === "true" && anchor.href === null && anchor.dataUrl === null && (anchor.level === 1 || nav === "WDxLfe" && anchor.level === 2 && anchor.more === "true");
}
function validChild(anchor, group, locale, classifyRoot) {
  const language = classifyRoot(anchor.href);
  return anchor.valid && anchor.level === group.level + 1 && anchor.navType === "2" && anchor.type === "2" && language && language === classifyRoot(anchor.dataUrl) && language !== locale && textValue(anchor.text) === LABELS[locale]?.[language] && anchor.more === "true" === (group.level === 2);
}
function finishGroup(state, classifyRoot) {
  const group = state.group;
  if (!group) return state;
  const languages = group.children.map((child) => classifyRoot(child.href));
  if (!group.valid || group.children.length !== 3 || new Set(languages).size !== 3)
    return { ...state, group: null };
  const key = `${group.nav}:${group.level}`;
  if (state.keys.has(key) || state.keys.size >= 3) return { ...state, invalid: true, group: null };
  return { ...state, group: null, keys: /* @__PURE__ */ new Set([...state.keys, key]), matches: [
    ...state.matches,
    ...group.children.map((child) => Object.freeze({ ordinal: child.ordinal, language: classifyRoot(child.href) }))
  ] };
}
function closeAnchor(state, ordinal, locale, classifyRoot) {
  const anchor = state.anchor;
  if (!anchor || anchor.ordinal !== ordinal) return { ...state, invalid: true };
  const next = { ...state, anchor: null };
  if (isParent(anchor, state.nav, locale)) {
    if (state.group) return { ...next, invalid: true };
    return { ...next, group: { nav: state.nav, level: anchor.level, valid: true, children: [] } };
  }
  if (!state.group) return next;
  return { ...next, group: {
    ...state.group,
    valid: state.group.valid && validChild(anchor, state.group, locale, classifyRoot) && state.group.children.length < 3,
    children: state.group.children.length < 4 ? [...state.group.children, anchor] : state.group.children
  } };
}
function createHeaderInspector(locale) {
  const classifyRoot = createRootClassifier();
  let state = { nav: null, anchor: null, group: null, ordinal: -1, seen: /* @__PURE__ */ new Set(), keys: /* @__PURE__ */ new Set(), matches: [], invalid: false };
  return {
    nav: { element(element) {
      const id = element.getAttribute("id");
      if (state.nav || !["yuynLe", "WDxLfe"].includes(id) || element.getAttribute("role") !== "navigation" || state.seen.has(id)) {
        state = { ...state, invalid: true };
        return;
      }
      state = { ...state, nav: id, seen: /* @__PURE__ */ new Set([...state.seen, id]) };
      element.onEndTag(() => {
        state = finishGroup(state, classifyRoot);
        state = { ...state, invalid: state.invalid || state.nav !== id || Boolean(state.anchor), nav: null };
      });
    } },
    anchor: {
      element(element) {
        if (!state.nav) return;
        if (state.anchor || state.ordinal >= 511) {
          state = { ...state, invalid: true };
          return;
        }
        const level = levelOf(element);
        if (state.group && (!Number.isInteger(level) || level <= state.group.level)) {
          if (!Number.isInteger(level)) state = { ...state, group: { ...state.group, valid: false } };
          state = finishGroup(state, classifyRoot);
        }
        const ordinal = state.ordinal + 1;
        const navType = element.getAttribute("data-navtype");
        const anchor = !state.group && navType !== "4" ? { ordinal, valid: false, skip: true } : readAnchor(element, ordinal, level, navType);
        state = { ...state, ordinal, anchor };
        element.onEndTag(() => {
          state = closeAnchor(state, ordinal, locale, classifyRoot);
        });
      },
      text(chunk) {
        if (!state.anchor || state.anchor.skip) return;
        const text = state.anchor.text + chunk.text;
        state = { ...state, anchor: {
          ...state.anchor,
          valid: state.anchor.valid && text.length <= 128,
          text: text.length <= 128 ? text : ""
        } };
      }
    },
    descendant: { element(element) {
      if (state.anchor && !state.anchor.skip && (element.tagName !== "span" || hasMedia(element)))
        state = { ...state, anchor: { ...state.anchor, valid: false } };
    } },
    context() {
      return state.invalid || state.nav || state.anchor || state.group || state.matches.length === 0 ? null : Object.freeze([...state.matches]);
    }
  };
}
function attachHeaderInspection(rewriter, inspector) {
  return rewriter.on(HEADER_NAV, inspector.nav).on(HEADER_ANCHOR, inspector.anchor).on(HEADER_DESCENDANT, inspector.descendant);
}
function createHeaderLanguageRewrite(policy, context) {
  const matches = context?.headerLanguageAnchors;
  if (!policy || context?.siteLanguage !== policy.language || !Array.isArray(matches) || !matches.length || matches.length > 9 || matches.some((match) => !Number.isInteger(match.ordinal) || match.ordinal < 0 || match.ordinal >= 512 || !policy.alternatives[match.language]) || new Set(matches.map((match) => match.ordinal)).size !== matches.length) return null;
  const languages = new Map(matches.map((match) => [match.ordinal, match.language]));
  const classifyRoot = createRootClassifier();
  let ordinal = -1;
  return { element(element) {
    ordinal += 1;
    const language = languages.get(ordinal);
    if (!language) return;
    const anchor = readAnchor(element, ordinal);
    if (anchor.valid && anchor.navType === "2" && anchor.type === "2" && classifyRoot(anchor.href) === language && classifyRoot(anchor.dataUrl) === language) {
      element.setAttribute("href", policy.alternatives[language]);
      element.setAttribute("data-url", policy.alternatives[language]);
    }
  } };
}

// renderer/src/language-controls.js
var FOOTER_GROUP = 'footer[jsname="yePe5c"] small.zfr3Q';
var ROOT_LANGUAGES2 = Object.freeze(Object.fromEntries(Object.values(SITES).flatMap((site) => [[site.productionOrigin, site.language], [site.productionOrigin + "/", site.language]])));
var LABELS2 = Object.freeze({
  es: Object.freeze({ "es": "ES Espa\xF1ol", "en": "EN Ingl\xE9s", "fr": "FR Franc\xE9s", "it": "IT Italiano" }),
  en: Object.freeze({ "es": "ES Spanish", "en": "EN English", "fr": "FR French", "it": "IT Italian" }),
  fr: Object.freeze({ "es": "ES Espagnol", "en": "EN Anglais", "fr": "FR Fran\xE7ais", "it": "IT Italien" }),
  it: Object.freeze({ "es": "ES Spagnolo", "en": "EN Inglese", "fr": "FR Francese", "it": "IT Italiano" })
});
var textValue2 = (value) => value.replace(/\s+/gu, " ").trim();
function hasMediaAttributes(element) {
  const style = element.getAttribute("style") ?? "";
  return style.includes("\\") || ["src", "srcset", "poster", "background", "data", "data-src"].some((name) => element.getAttribute(name) !== null) || /(?:url\s*\(|(?:background(?:-image)?|mask(?:-image)?|content)\s*:)/iu.test(style);
}
var rootLanguage2 = (href) => Object.hasOwn(ROOT_LANGUAGES2, href) ? ROOT_LANGUAGES2[href] : null;
function recognizedGroup(group, locale) {
  if (!group.valid || !LABELS2[locale]) return false;
  const visible2 = group.anchors.filter((anchor) => textValue2(anchor.text));
  return visible2.length === 4 && Object.keys(SITES).every((language) => visible2.filter((anchor) => anchor.language === language && textValue2(anchor.text) === LABELS2[locale][language]).length === 1) && group.anchors.every((anchor) => anchor.valid && anchor.language && anchor.text.length > 0);
}
function createDocumentInspector(locale) {
  const header = createHeaderInspector(locale);
  let documentLanguage = null;
  let htmlCount = 0;
  let ordinal = -1;
  let active = null;
  let anchor = null;
  let matches = [];
  let invalid2 = false;
  const closeAnchor2 = (groupOrdinal) => {
    if (!anchor || !active || anchor.group !== groupOrdinal || active.ordinal !== groupOrdinal) {
      invalid2 = true;
      return;
    }
    active = { ...active, anchors: [...active.anchors, anchor] };
    anchor = null;
  };
  return {
    header,
    html: { element(element) {
      htmlCount += 1;
      documentLanguage = element.getAttribute("lang");
    } },
    group: { element(element) {
      ordinal += 1;
      if (active || ordinal >= 16) {
        invalid2 = true;
        return;
      }
      const id = ordinal;
      active = { ordinal: id, valid: true, anchors: [] };
      element.onEndTag(() => {
        if (!active || active.ordinal !== id || anchor) {
          invalid2 = true;
          active = null;
          anchor = null;
          return;
        }
        if (recognizedGroup(active, locale)) matches = [...matches, id];
        active = null;
      });
    } },
    anchor: {
      element(element) {
        if (!active) return;
        if (anchor || active.anchors.length >= 8) {
          invalid2 = true;
          active = { ...active, valid: false };
          return;
        }
        const id = active.ordinal;
        anchor = {
          group: id,
          language: rootLanguage2(element.getAttribute("href")),
          text: "",
          valid: !hasMediaAttributes(element) && (element.getAttribute("class") ?? "").split(/\s+/u).includes("XqQF9c")
        };
        element.onEndTag(() => closeAnchor2(id));
      },
      text(chunk) {
        if (!anchor || !anchor.valid) return;
        if (anchor.text.length + chunk.text.length > 256) anchor = { ...anchor, valid: false, text: "" };
        else anchor = { ...anchor, text: anchor.text + chunk.text };
      }
    },
    descendant: { element(element) {
      if (active && (!["a", "span"].includes(element.tagName) || hasMediaAttributes(element))) {
        active = { ...active, valid: false };
      }
    } },
    context() {
      return Object.freeze({
        authorLanguage: htmlCount === 1 ? documentLanguage : null,
        siteLanguage: htmlCount === 1 ? locale : null,
        headerLanguageAnchors: htmlCount === 1 ? header.context() : null,
        languageGroup: !invalid2 && !active && !anchor && htmlCount === 1 && matches.length === 1 ? matches[0] : null
      });
    }
  };
}
function attachDocumentInspection(rewriter, inspector) {
  attachHeaderInspection(rewriter, inspector.header);
  return rewriter.on("html", inspector.html).on(FOOTER_GROUP, inspector.group).on(`${FOOTER_GROUP} a`, inspector.anchor).on(`${FOOTER_GROUP} *`, inspector.descendant);
}
function createLanguageRewrite(policy, context) {
  if (!policy || context?.siteLanguage !== policy.language || !Number.isInteger(context.languageGroup)) return null;
  let ordinal = -1;
  let active = false;
  return {
    group: { element(element) {
      ordinal += 1;
      active = ordinal === context.languageGroup;
      element.onEndTag(() => {
        active = false;
      });
    } },
    anchor: { element(element) {
      if (!active) return;
      const language = rootLanguage2(element.getAttribute("href"));
      if (language && language !== policy.language && policy.alternatives[language]) {
        element.setAttribute("href", policy.alternatives[language]);
      }
    } }
  };
}

// renderer/src/rendering-assets.js
var HOME_SECTION = 'section[id="h.INITIAL_GRID.85u6di9ec7a5"]';
var LOGO_WIDGET = '[id="h.4a7e47a7ec29bfb_69"]';
var HERO_LABEL = "Servicios legales y corporativos en Panam\xE1 en un centro financiero internacional";
var LOGO_LABEL = "Logo de Panam\xE1 Legal Lab con s\xEDmbolo gr\xE1fico y nombre de la marca en naranja y blanco.";
var LOGO_RATIO = "aspect-ratio: auto 1168 / 854;";
var HERO_PRIORITY = false ? true : false;
var CDN_PREFIX = "https://lh7-us.googleusercontent.com/sitesv-images-rt/";
var unsafe = /[\s\\\u0000-\u001f\u007f-\u009f"'<>`]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/iu;
function approvedImageUrl(value) {
  if (typeof value !== "string" || value.length > 4096 || unsafe.test(value)) return null;
  const rewritten = rewriteImageReferences(value.replaceAll("&amp;", "&"));
  if (/&#|&(?:amp|quot|lt|gt|apos)|&[a-z][a-z0-9]*;/iu.test(rewritten)) return null;
  if (!rewritten.startsWith(CDN_PREFIX) || rewritten.length === CDN_PREFIX.length) return null;
  let url;
  try {
    url = new URL(rewritten);
  } catch {
    return null;
  }
  return url.origin === "https://lh7-us.googleusercontent.com" && !url.username && !url.password && !url.port && !url.hash && url.pathname.startsWith("/sitesv-images-rt/") ? rewritten : null;
}
function heroImageUrl(element) {
  if (element.getAttribute("aria-label") !== HERO_LABEL || element.getAttribute("jsname") !== "LQX2Vd" || !(element.getAttribute("class") ?? "").split(/\s+/u).includes("IFuOkc")) return null;
  const style = element.getAttribute("style") ?? "";
  if (style.length > 8192 || /[\\\u0000-\u001f]|\/\*/u.test(style)) return null;
  if ((style.match(/(?:^|;)\s*background(?:-image)?\s*:/giu) ?? []).length !== 1) return null;
  const match = style.match(/(?:^|;)\s*background-image\s*:\s*url\(\s*(?:"([^"]+)"|'([^']+)'|([^\s"'()]+))\s*\)\s*(?:;|$)/iu);
  return match ? approvedImageUrl(match[1] ?? match[2] ?? match[3]) : null;
}
function logoCanReserveRatio(element) {
  if (element.getAttribute("role") !== "img" || element.getAttribute("alt") !== LOGO_LABEL || !(element.getAttribute("class") ?? "").split(/\s+/u).includes("CENy8b") || !approvedImageUrl(element.getAttribute("src")) || element.getAttribute("srcset") !== null || element.getAttribute("width") !== null || element.getAttribute("height") !== null) return false;
  const style = element.getAttribute("style") ?? "";
  return style.length <= 2048 && !/[\\\u0000-\u001f]|\/\*/u.test(style) && !/(?:^|;)\s*(?:aspect-ratio|(?:min-|max-)?(?:width|height)|object-(?:fit|position))\s*:/iu.test(style);
}
function imagePreload(url) {
  const escaped = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return `<link rel="preload" as="image" fetchpriority="high" href="${escaped}">`;
}
function isEsHome(plan) {
  return plan.kind === "page" && !plan.searchPage && plan.site?.language === "es" && plan.canonical === `${plan.site.productionOrigin}/` && ["/", "/inicio"].includes(plan.path);
}

// renderer/src/rendering-navigation.js
var NATIVE_HEADER_LINK = "header#atIdViewHeader a";
var HOME = Object.freeze({ es: "inicio", en: "home", fr: "accueil", it: "inizio" });
function ownPage(value, site) {
  if (typeof value !== "string" || value.length > 4096 || /[\s\\\u0000-\u001f\u007f]|%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/iu.test(value)) return null;
  let url;
  try {
    url = new URL(rewriteProductionUrl(value));
  } catch {
    return null;
  }
  if (url.origin !== site.productionOrigin || url.username || url.password || url.port || url.search || url.hash) return null;
  return `${site.productionOrigin}${url.pathname === `/${HOME[site.language]}` ? "/" : url.pathname}`;
}
function navigationAriaDecision(element, plan) {
  const classes = (element.getAttribute("class") ?? "").split(/\s+/u);
  const controller = element.getAttribute("jscontroller");
  const nativeController = controller === "yUHiM" && element.getAttribute("jsaction") === "rcuQ6b:WYd;";
  const nativeMobile = controller === null && element.getAttribute("jsaction") === null && classes.includes("hDrhEe");
  const selected = element.getAttribute("aria-selected");
  if (!nativeController && !nativeMobile || !classes.includes("aJHbb") || element.getAttribute("role") !== "link" || element.getAttribute("jsname") !== "QwLHlb" || element.getAttribute("data-navtype") !== "1" || element.getAttribute("data-type") !== "1" || !["1", "2", "3"].includes(element.getAttribute("data-level")) || !["true", "false"].includes(selected)) return null;
  const href = ownPage(element.getAttribute("href"), plan.site);
  const dataUrl = ownPage(element.getAttribute("data-url"), plan.site);
  if (!href || href !== dataUrl) return null;
  return Object.freeze({ current: selected === "true" && href === plan.canonical && element.getAttribute("aria-current") === null });
}
function rewriteNavigationAria(element, plan) {
  const decision = navigationAriaDecision(element, plan);
  if (!decision) return;
  element.removeAttribute("aria-selected");
  if (decision.current) element.setAttribute("aria-current", "page");
}

// renderer/src/rendering-profile.js
var HERO = `${HOME_SECTION} div[role="img"]`;
var LOGO_IMAGE = `${HOME_SECTION} ${LOGO_WIDGET} img`;
var nativePreloader = /\bnew\s+(?:window\.)?Image\s*\(|\b(?:headerBgImgLoaded|headerBgImgExists|bgImgLoaded)\b/u;
function createRenderingInspector(plan) {
  let state = {
    html: 0,
    head: 0,
    header: 0,
    markers: 0,
    validSite: true,
    section: 0,
    widget: 0,
    heroes: 0,
    heroUrl: null,
    images: 0,
    logo: false,
    charset: 0,
    earlyCharset: false,
    priorScript: "",
    unsafePriorScript: false,
    preloads: [],
    preloadOverflow: false
  };
  const counter = (name) => ({ element() {
    state = { ...state, [name]: state[name] + 1 };
  } });
  return {
    home: isEsHome(plan),
    html: counter("html"),
    head: counter("head"),
    header: counter("header"),
    section: counter("section"),
    widget: counter("widget"),
    marker: { element(element) {
      state = { ...state, markers: state.markers + 1, validSite: state.validSite && element.getAttribute("data-domain") === "panamalegallab.com" && element.getAttribute("data-sitename") === plan.site.upstreamPrefix.split("/").at(-1) };
    } },
    charset: { element(element) {
      state = {
        ...state,
        charset: state.charset + 1,
        earlyCharset: !state.unsafePriorScript && !nativePreloader.test(state.priorScript) && /^utf-?8$/iu.test(element.getAttribute("charset") ?? ""),
        priorScript: ""
      };
    } },
    // Current Google Sites has its non-image ppConfig bootstrap before charset.
    // Preserve that ordering. A native image preloader, an external script or an
    // oversized unknown prefix before charset makes a new later hint a no-op.
    script: {
      element(element) {
        if (state.charset === 0 && element.getAttribute("src") !== null) state = { ...state, unsafePriorScript: true };
      },
      text(chunk) {
        if (state.charset !== 0 || state.unsafePriorScript) return;
        const prefix = state.priorScript + chunk.text;
        state = prefix.length > 32768 ? { ...state, unsafePriorScript: true, priorScript: "" } : { ...state, priorScript: prefix };
      }
    },
    hero: { element(element) {
      state = { ...state, heroes: state.heroes + 1, heroUrl: heroImageUrl(element) };
    } },
    image: { element(element) {
      state = { ...state, images: state.images + 1, logo: logoCanReserveRatio(element) };
    } },
    preload: { element(element) {
      if (!(element.getAttribute("rel") ?? "").toLowerCase().split(/\s+/u).includes("preload") || element.getAttribute("as")?.toLowerCase() !== "image") return;
      if (state.preloads.length >= 32) {
        state = { ...state, preloadOverflow: true };
        return;
      }
      state = { ...state, preloads: [...state.preloads, approvedImageUrl(element.getAttribute("href"))] };
    } },
    context() {
      const document = state.html === 1 && state.head === 1 && state.markers === 1 && state.validSite;
      const home = document && isEsHome(plan) && state.section === 1;
      return Object.freeze({
        navigation: document && state.header === 1,
        logo: home && state.widget === 1 && state.images === 1 && state.logo,
        heroUrl: HERO_PRIORITY && home && state.heroes === 1 && state.heroUrl && state.charset === 1 && state.earlyCharset && !state.preloadOverflow && !state.preloads.includes(state.heroUrl) ? state.heroUrl : null
      });
    }
  };
}
function attachRenderingInspection(rewriter, inspector) {
  rewriter.on("html", inspector.html).on("head", inspector.head).on("header#atIdViewHeader", inspector.header).on("[data-domain][data-sitename]", inspector.marker);
  if (!inspector.home) return rewriter;
  rewriter.on(HOME_SECTION, inspector.section).on(LOGO_WIDGET, inspector.widget).on(LOGO_IMAGE, inspector.image);
  if (HERO_PRIORITY) rewriter.on("head meta[charset]", inspector.charset).on("head script", inspector.script).on(HERO, inspector.hero).on("head link", inspector.preload);
  return rewriter;
}
function attachRenderingRewrite(rewriter, plan) {
  const context = plan.documentContext?.rendering;
  if (!context) return rewriter;
  if (context.navigation) rewriter.on(NATIVE_HEADER_LINK, { element(element) {
    rewriteNavigationAria(element, plan);
  } });
  if (context.logo) rewriter.on(LOGO_IMAGE, { element(element) {
    if (!logoCanReserveRatio(element)) return;
    const style = element.getAttribute("style") ?? "";
    element.setAttribute("style", `${style}${style && !style.trimEnd().endsWith(";") ? ";" : ""}${style ? " " : ""}${LOGO_RATIO}`);
  } });
  if (context.heroUrl) rewriter.on("head meta[charset]", { element(element) {
    element.after(imagePreload(context.heroUrl), { html: true });
  } });
  return rewriter;
}

// renderer/src/html.js
function isExpectedSiteMarker(domain, name, site) {
  return domain === "panamalegallab.com" && name === site.upstreamPrefix.split("/").at(-1);
}
async function identifyPublicSite(html, site, Rewriter, { collectReadiness = false, renderPlan, onDocumentContext } = {}) {
  let identified = false;
  const inspector = collectReadiness ? createDocumentInspector(site.language) : null;
  const rendering = renderPlan?.kind === "page" && !renderPlan.searchPage ? createRenderingInspector(renderPlan) : null;
  const rewriter = new Rewriter().on("[data-domain][data-sitename]", { element(element) {
    if (isExpectedSiteMarker(element.getAttribute("data-domain"), element.getAttribute("data-sitename"), site)) identified = true;
  } });
  if (inspector) attachDocumentInspection(rewriter, inspector);
  if (rendering) attachRenderingInspection(rewriter, rendering);
  await rewriter.transform(new Response(html)).text();
  if (inspector || rendering) onDocumentContext?.(Object.freeze({ ...inspector?.context(), rendering: rendering?.context() ?? null }));
  return identified;
}
function createDeliveryValueRewriter(plan) {
  const cache = /* @__PURE__ */ new Map();
  let characters = 0;
  return (original) => {
    if (cache.has(original)) return cache.get(original);
    const nonHttpScheme = typeof original === "string" && /^(?!https?:)[a-z][a-z0-9+.-]*:/iu.test(original);
    const rewritten = rewriteImageReferences(nonHttpScheme ? original : usesProductionRendering(plan) ? rewriteProductionUrl(original) : rewriteSiteUrl(original, plan.previewOrigin));
    const size = (original?.length ?? 0) + (rewritten?.length ?? 0);
    if (cache.size < 512 && characters + size <= 65536) {
      cache.set(original, rewritten);
      characters += size;
    }
    return rewritten;
  };
}
function makeDeliveryAttributeHandler(name, plan, rewriteValue = createDeliveryValueRewriter(plan)) {
  return { element(element) {
    const original = element.getAttribute(name);
    const rewritten = rewriteValue(original);
    if (rewritten !== original) element.setAttribute(name, rewritten);
  } };
}
function createCoreDocumentRewriter(plan, Rewriter, options = {}) {
  const rewriteValue = options.rewriteValue ?? createDeliveryValueRewriter(plan);
  let configurations = 0;
  let compatibilityFailure = false;
  let scriptBuffer = "";
  let deferredError = null;
  const protect = (handler3) => options.deferErrors ? Object.fromEntries(Object.entries(handler3).map(([name, callback]) => [name, (...args) => {
    if (deferredError) return;
    try {
      callback(...args);
    } catch (error2) {
      deferredError = error2;
    }
  }])) : handler3;
  const scripts = makeScriptHandler(plan, { bootstrapMode: "clear-google-redirect", onConfigValidated() {
    configurations += 1;
  } });
  const guardedScripts = { text(chunk) {
    const original = scriptBuffer + chunk.text;
    if (original.length > 512e3) throw new Error("Inline source exceeds delivery limit");
    scriptBuffer = chunk.lastInTextNode ? "" : original;
    try {
      scripts.text(chunk);
    } catch (error2) {
      if (!(error2 instanceof PreviewCompatibilityError)) throw error2;
      try {
        chunk.replace(clearEquivalentQueryConfig(original, plan), { html: true });
        configurations += 1;
      } catch (retryError) {
        if (!(retryError instanceof PreviewCompatibilityError)) throw retryError;
        compatibilityFailure = true;
        chunk.remove();
      }
    }
  } };
  const metadata = options.metadata ?? descriptionTag(plan.readinessPolicy, plan.documentContext);
  const language = createLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const headerLanguage = createHeaderLanguageRewrite(plan.readinessPolicy, plan.documentContext);
  const canonical = plan.canonical.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const canonicalTag = `<link rel="canonical" href="${canonical}">`;
  const rewriter = (options.rewriter ?? new Rewriter()).on("head", { element(element) {
    element.append(canonicalTag + (options.headExtra ? options.headExtra(canonicalTag) : metadata), { html: true });
  } }).on('link[rel~="canonical"]', { element(element) {
    element.remove();
  } }).on('meta[property="og:url"], meta[itemprop="url"]', { element(element) {
    element.setAttribute("content", plan.canonical);
  } }).on("script:not([src])", protect(guardedScripts)).on("style", protect(makeImageStyleHandler())).on('meta[property="og:image"], meta[itemprop="image"], meta[itemprop="imageUrl"], meta[itemprop="thumbnailUrl"]', makeDeliveryAttributeHandler("content", plan, rewriteValue));
  if (metadata) rewriter.on("head meta[name]", options.descriptionHandler ?? { element(element) {
    if (element.getAttribute("name")?.toLowerCase() === "description") element.remove();
  } });
  if (language) rewriter.on(FOOTER_GROUP, language.group).on(`${FOOTER_GROUP} a`, language.anchor);
  if (headerLanguage) rewriter.on(HEADER_ANCHOR, headerLanguage);
  if (options.rendering !== false) attachRenderingRewrite(rewriter, plan);
  for (const attribute of ["href", "src", "srcset", "style", "action", "data-url"]) {
    rewriter.on(`[${attribute}]`, makeDeliveryAttributeHandler(attribute, plan, rewriteValue));
  }
  rewriter.onDocument({ end() {
    if (configurations !== 1) compatibilityFailure = true;
  } });
  return { rewriter, validate() {
    if (deferredError) throw deferredError;
    if (compatibilityFailure) throw new PreviewCompatibilityError();
  } };
}
async function rewritePageDocument(html, plan, Rewriter) {
  const { rewriter, validate } = createCoreDocumentRewriter(plan, Rewriter);
  const rewritten = await rewriter.transform(new Response(html)).text();
  validate();
  return rewritten;
}

// renderer/src/quota.js
function createClientQuota({ limit, maxBuckets = 4096, duration = 6e4 } = {}) {
  let buckets = /* @__PURE__ */ new Map();
  return (request, now) => {
    const client = request.headers.get("CF-Connecting-IP");
    if (!client) return true;
    const window = Math.floor(now / duration);
    buckets = new Map([...buckets].filter(([, value]) => value.window === window));
    const current = buckets.get(client);
    const count = current?.window === window ? current.count + 1 : 1;
    if (buckets.size >= maxBuckets && !current) {
      return false;
    }
    buckets = new Map([...buckets, [client, Object.freeze({ window, count })]]);
    return count <= limit;
  };
}

// renderer/src/search.js
async function relayDeliverySearch(request, plan, options) {
  const response = await relaySearchPost(
    request,
    plan,
    { ...options, ...usesProductionRendering(plan) ? { rewriteUrl: (value) => rewriteProductionUrl(value) } : {} }
  );
  if (!usesProductionRendering(plan) || response.status < 500) return response;
  return new Response("Public search is temporarily unavailable.", { status: 503, headers: response.headers });
}

// renderer/src/deferred-markers.js
var whitespace = (char) => char !== void 0 && /[\t\n\f\r ]/u.test(char);
var invalid = () => new Error("Deferred document transaction is invalid.");
function startTag(input, offset = 0) {
  if (input[offset] !== "<" || offset + 1 >= input.length || !/[a-z]/iu.test(input[offset + 1])) throw invalid();
  let position = offset + 2;
  while (position < input.length && /[a-z0-9:_-]/iu.test(input[position])) position += 1;
  const openingEnd = position;
  const tagName = input.slice(offset + 1, openingEnd).toLowerCase();
  if (!whitespace(input[position]) && input[position] !== ">" && !(input[position] === "/" && input[position + 1] === ">")) throw invalid();
  let lastAttribute = position;
  const attributes = [];
  while (position < input.length) {
    const spaceStart = position;
    while (whitespace(input[position])) position += 1;
    if (input[position] === ">" || input[position] === "/" && input[position + 1] === ">") {
      const selfClosing = input[position] === "/";
      return {
        name: tagName,
        openingEnd,
        attributes,
        lastAttribute,
        selfClosing,
        closeStart: position,
        end: position + (selfClosing ? 2 : 1)
      };
    }
    const nameStart = position;
    while (position < input.length && !/[\t\n\f\r =/>"']/u.test(input[position])) position += 1;
    if (position === nameStart) throw invalid();
    const nameEnd = position;
    while (whitespace(input[position])) position += 1;
    if (input[position] === "=") {
      position += 1;
      while (whitespace(input[position])) position += 1;
      const quote = input[position];
      if (quote === '"' || quote === "'") {
        position = input.indexOf(quote, position + 1);
        if (position < 0) throw invalid();
        position += 1;
      } else {
        const valueStart = position;
        while (position < input.length && !/[\t\n\f\r >]/u.test(input[position])) position += 1;
        if (position === valueStart) throw invalid();
      }
    } else position = nameEnd;
    attributes.push({ name: input.slice(nameStart, nameEnd), spaceStart, nameStart, end: position });
    lastAttribute = position;
  }
  throw invalid();
}
function applyTagChanges(tag, changes) {
  let result = tag;
  for (const [name, value] of changes) {
    if (!/^[a-z_:][a-z0-9:_.-]*$/iu.test(name) || value !== null && typeof value !== "string") throw invalid();
    const parsed = startTag(result);
    if (parsed.end !== result.length) throw invalid();
    const index = parsed.attributes.findIndex((item) => item.name.toLowerCase() === name.toLowerCase());
    const attribute = parsed.attributes[index];
    const rawAttributes = parsed.attributes.map((item) => result.slice(item.nameStart, item.end));
    if (value === null) {
      if (!attribute) continue;
      rawAttributes.splice(index, 1);
    } else {
      const encoded = value.replaceAll('"', "&quot;");
      if (attribute) rawAttributes[index] = `${attribute.name}="${encoded}"`;
      else rawAttributes.push(`${name}="${encoded}"`);
    }
    result = result.slice(0, parsed.openingEnd) + (rawAttributes.length ? " " + rawAttributes.join(" ") : "") + (parsed.selfClosing ? " />" : ">");
  }
  return result;
}
function createDeferredMarkers(source, { limit = 2048 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 4096) throw invalid();
  let prefix;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = `<!--pll-deferred-${crypto.randomUUID()}:`;
    if (!source.includes(candidate)) {
      prefix = candidate;
      break;
    }
  }
  if (!prefix) throw invalid();
  const records = [];
  function allocate(kind, tagName, data) {
    if (records.length >= limit || tagName !== null && !/^[a-z][a-z0-9:_-]*$/iu.test(tagName)) throw invalid();
    const id = records.length;
    const marker = `${prefix}${id}-->`;
    records.push(Object.freeze({ id, marker, kind, tagName: tagName?.toLowerCase() ?? null, data: Object.freeze({ ...data }) }));
    return marker;
  }
  return {
    prefix,
    tag: (name, data) => allocate("tag", name, data),
    insert: (data) => allocate("insert", null, data),
    commit(serialized, resolve) {
      const chunks = [];
      const seen = /* @__PURE__ */ new Set();
      let cursor = 0;
      let lastTagId = -1;
      while (true) {
        const position = serialized.indexOf(prefix, cursor);
        if (position < 0) break;
        chunks.push(serialized.slice(cursor, position));
        const cluster = [];
        let after = position;
        while (serialized.startsWith(prefix, after)) {
          const end = serialized.indexOf("-->", after + prefix.length);
          if (end < 0) throw invalid();
          const idText = serialized.slice(after + prefix.length, end);
          if (!/^\d{1,4}$/u.test(idText)) throw invalid();
          const record = records[Number(idText)];
          if (!record || record.marker !== serialized.slice(after, end + 3) || seen.has(record.id)) throw invalid();
          if (record.kind === "tag") {
            if (record.id <= lastTagId) throw invalid();
            lastTagId = record.id;
          }
          seen.add(record.id);
          cluster.push(record);
          after = end + 3;
          if (record.kind === "insert" && cluster.length === 1) break;
        }
        if (cluster[0].kind === "insert") {
          if (cluster.length !== 1) throw invalid();
          const { preceding } = cluster[0].data;
          if (preceding && serialized.slice(position - preceding.length, position) !== preceding) throw invalid();
          const inserted = resolve(cluster[0].data);
          if (typeof inserted !== "string") throw invalid();
          chunks.push(inserted);
          cursor = after;
          continue;
        }
        const tag = startTag(serialized, after);
        if (cluster.some((record) => record.kind !== "tag" || record.tagName !== tag.name)) throw invalid();
        const base = serialized.slice(after, tag.end);
        const decisions = cluster.map((record) => resolve(record.data));
        if (!decisions.some((decision) => decision?.remove === true)) {
          let patched = base;
          for (const decision of decisions) {
            if (!Array.isArray(decision)) throw invalid();
            patched = applyTagChanges(patched, decision);
          }
          chunks.push(patched);
        }
        cursor = tag.end;
      }
      if (seen.size !== records.length) throw invalid();
      chunks.push(serialized.slice(cursor));
      const output = chunks.join("");
      if (output.includes(prefix)) throw invalid();
      return output;
    }
  };
}

// renderer/src/deferred-features.js
var MEDIA = ["style", "src", "srcset", "poster", "background", "data", "data-src"];
var HEADER = [
  "class",
  "jsname",
  "role",
  "data-navtype",
  "data-type",
  "data-level",
  "href",
  "data-url",
  "aria-haspopup",
  "data-in-more-submenu",
  ...MEDIA
];
var ARIA = [
  "class",
  "jscontroller",
  "jsaction",
  "jsname",
  "role",
  "data-navtype",
  "data-type",
  "data-level",
  "href",
  "data-url",
  "aria-selected",
  "aria-current"
];
var LOGO = ["class", "role", "alt", "src", "srcset", "width", "height", "style"];
var snapshot = (element, names) => Object.freeze(Object.fromEntries(names.map((name) => [name, element.getAttribute(name)])));
function scalarElement(original = {}) {
  let attributes = { ...original };
  let changes = [];
  return {
    getAttribute: (name) => attributes[name] ?? null,
    setAttribute(name, value) {
      attributes = { ...attributes, [name]: value };
      changes = [...changes, [name, value]];
    },
    removeAttribute(name) {
      attributes = { ...attributes, [name]: null };
      changes = [...changes, [name, null]];
    },
    onEndTag() {
    },
    changes: () => changes
  };
}
function createDeferredFeatures(plan, staged, rewriteValue) {
  let headerOrdinal = -1;
  let footerOrdinal = -1;
  let activeFooter = -1;
  let footerAnchors = 0;
  const policy = plan.readinessPolicy;
  function mark(element, data) {
    element.before(staged.tag(element.tagName, data), { html: true });
  }
  return {
    coreOptions: {
      metadata: policy?.description ? "deferred-description" : "",
      headExtra: (canonical) => policy?.description ? staged.insert({ type: "description", preceding: canonical }) : "",
      descriptionHandler: { element(element) {
        if (policy?.description && element.getAttribute("name")?.toLowerCase() === "description") mark(element, { type: "author-description" });
      } },
      rendering: false
    },
    attach(rewriter) {
      if (policy) {
        rewriter.on(HEADER_ANCHOR, { element(element) {
          headerOrdinal += 1;
          if (headerOrdinal < 512 && element.getAttribute("data-navtype") === "2" && element.getAttribute("data-type") === "2") {
            mark(element, { type: "header", ordinal: headerOrdinal, attributes: snapshot(element, HEADER) });
          }
        } }).on(FOOTER_GROUP, { element(element) {
          footerOrdinal += 1;
          activeFooter = footerOrdinal;
          footerAnchors = 0;
        } }).on(`${FOOTER_GROUP} a`, { element(element) {
          footerAnchors += 1;
          if (activeFooter >= 0 && activeFooter < 16 && footerAnchors <= 8) {
            mark(element, { type: "footer", ordinal: activeFooter, attributes: snapshot(element, ["href"]) });
          }
        } });
      }
      if (plan.kind === "page" && !plan.searchPage) rewriter.on(NATIVE_HEADER_LINK, { element(element) {
        if (["true", "false"].includes(element.getAttribute("aria-selected")) && element.getAttribute("data-navtype") === "1" && element.getAttribute("data-type") === "1") {
          mark(element, { type: "aria", attributes: snapshot(element, ARIA) });
        }
      } });
      if (isEsHome(plan)) rewriter.on(`${HOME_SECTION} ${LOGO_WIDGET} img`, { element(element) {
        mark(element, { type: "logo", attributes: snapshot(element, LOGO) });
      } });
      if (HERO_PRIORITY && isEsHome(plan)) rewriter.on("head meta[charset]", { element(element) {
        element.after(staged.insert({ type: "hero" }), { html: true });
      } });
      return rewriter;
    },
    resolver(context) {
      const metadata = descriptionTag(policy, context);
      const header = createHeaderLanguageRewrite(policy, context);
      const footer = createLanguageRewrite(policy, context);
      let headerPosition = -1;
      let footerPosition = -1;
      return (record) => {
        if (record.type === "description") return metadata;
        if (record.type === "hero") return context?.rendering?.heroUrl ? imagePreload(context.rendering.heroUrl) : "";
        if (record.type === "author-description") return metadata ? { remove: true } : [];
        const element = scalarElement(record.attributes);
        if (record.type === "header" && header) {
          while (headerPosition < record.ordinal) {
            headerPosition += 1;
            header.element(headerPosition === record.ordinal ? element : scalarElement());
          }
        } else if (record.type === "footer" && footer) {
          while (footerPosition < record.ordinal) {
            footerPosition += 1;
            footer.group.element(scalarElement());
          }
          footer.anchor.element(element);
        } else if (record.type === "aria" && context?.rendering?.navigation) rewriteNavigationAria(element, plan);
        else if (record.type === "logo" && context?.rendering?.logo && logoCanReserveRatio(element)) {
          const style = element.getAttribute("style") ?? "";
          element.setAttribute("style", `${style}${style && !style.trimEnd().endsWith(";") ? ";" : ""}${style ? " " : ""}${LOGO_RATIO}`);
          makeDeliveryAttributeHandler("style", plan, rewriteValue).element(element);
        }
        return element.changes();
      };
    }
  };
}

// renderer/src/single-pass.js
async function rewriteValidatedDocument(html, plan, Rewriter) {
  let identified = false;
  const inspector = plan.readinessPolicy ? createDocumentInspector(plan.site.language) : null;
  const rendering = plan.kind === "page" && !plan.searchPage ? createRenderingInspector(plan) : null;
  const staged = createDeferredMarkers(html);
  const rewriteValue = createDeliveryValueRewriter(plan);
  const features = createDeferredFeatures(plan, staged, rewriteValue);
  const rewriter = new Rewriter().on("[data-domain][data-sitename]", { element(element) {
    if (isExpectedSiteMarker(element.getAttribute("data-domain"), element.getAttribute("data-sitename"), plan.site)) identified = true;
  } });
  if (inspector) attachDocumentInspection(rewriter, inspector);
  if (rendering) attachRenderingInspection(rewriter, rendering);
  features.attach(rewriter);
  const core = createCoreDocumentRewriter(
    plan,
    Rewriter,
    { ...features.coreOptions, rewriter, rewriteValue, deferErrors: true }
  );
  const serialized = await rewriter.transform(new Response(html)).text();
  if (!identified) return { identified: false };
  try {
    core.validate();
    const context = Object.freeze({ ...inspector?.context(), rendering: rendering?.context() ?? null });
    return { identified: true, html: staged.commit(serialized, features.resolver(context)) };
  } catch (error2) {
    return { identified: true, error: error2 };
  }
}

// renderer/src/worker.js
var PAGE_BODY_LIMIT = 1048576;
function deliveryHeaders(plan, extra = {}) {
  const noindex = plan.mode === "preview" || plan.mode === "production" && plan.indexable === false;
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...noindex ? { "X-Robots-Tag": "noindex, nofollow" } : {},
    ...extra
  };
}
function respond(plan, body, status = 200, headers3 = {}, method = "GET") {
  return new Response(method === "HEAD" ? null : body, {
    status,
    headers: deliveryHeaders(plan, { "Content-Type": "text/plain; charset=utf-8", ...headers3 })
  });
}
function errorResponse(plan, status, method = "GET") {
  if (status === 404 && plan.site) return respond(
    plan,
    `<!doctype html><html><title>Page not found</title><h1>404</h1><p>Page not found.</p><a href="${plan.site.productionOrigin}/">Panama Legal Lab</a></html>`,
    404,
    { "Content-Type": "text/html; charset=utf-8" },
    method
  );
  const temporary = status >= 500 || status === 429;
  return respond(
    plan,
    temporary ? "This page is temporarily unavailable. Please try again shortly." : "Request not available.",
    status,
    { ...temporary ? { "Retry-After": "60" } : {}, ...status === 405 ? { Allow: "GET, HEAD" } : {} },
    method
  );
}
function publicResponseHeaders(upstream, plan) {
  const omitted = [
    "set-cookie",
    "content-length",
    "content-encoding",
    "alt-svc",
    "reporting-endpoints",
    "cache-control",
    "x-content-type-options"
  ];
  return new Headers([
    ...Array.from(upstream.headers).filter(([name]) => !omitted.includes(name.toLowerCase())),
    ...Object.entries(deliveryHeaders(plan))
  ]);
}
function utilityResponse(request, plan) {
  if (plan.kind === "error") return errorResponse(plan, plan.status, request.method);
  if (plan.kind === "redirect") return respond(plan, null, plan.status, { Location: plan.location }, request.method);
  if (plan.kind === "robots") return respond(plan, "User-agent: *\nDisallow:\n" + (plan.mode === "production" ? "\nSitemap: https://sitemaps.panamalegallab.com/sitemap-index.xml\n" : ""), 200, {}, request.method);
  if (plan.kind !== "index") return null;
  const links2 = Object.keys(SITES).map((language) => `<li><a href="/${language}/">${language.toUpperCase()}</a></li>`).join("");
  return respond(
    plan,
    `<!doctype html><html lang="es"><title>Panama Legal Lab \u2014 preview</title><h1>Vista previa</h1><ul>${links2}</ul></html>`,
    200,
    { "Content-Type": "text/html; charset=utf-8" },
    request.method
  );
}
function approvedSourceRedirect(location, plan, requestUrl) {
  if (typeof location !== "string" || !location.trim() || /[\\\u0000-\u001f\u007f-\u009f]/u.test(location)) return null;
  let parsed;
  try {
    parsed = new URL(location, plan.upstream);
  } catch {
    return null;
  }
  if (parsed.origin !== "https://sites.google.com" || parsed.username || parsed.password || parsed.port || !(parsed.pathname === plan.site.upstreamPrefix || parsed.pathname.startsWith(`${plan.site.upstreamPrefix}/`))) return null;
  const rewritten = usesProductionRendering(plan) ? rewriteProductionUrl(parsed.href) : rewriteSiteUrl(parsed.href, plan.previewOrigin);
  const target = new URL(rewritten, requestUrl).href;
  const next = planDeliveryRequest(target);
  if (target === requestUrl || !["page", "redirect"].includes(next.kind) || next.site?.language !== plan.site.language) return null;
  return target;
}
async function adaptPublicHtml(upstream, plan, options) {
  const html = await readBoundedPageText(upstream.body, PAGE_BODY_LIMIT, upstream.headers.get("Content-Length"));
  const Rewriter = options.Rewriter ?? HTMLRewriter;
  const readinessPolicy = selectReadinessPolicy(plan);
  if (options.combinedDocument) {
    const result = await options.combinedDocument(html, { ...plan, readinessPolicy }, Rewriter);
    if (!result.identified) return errorResponse(plan, 503);
    try {
      if (result.error) throw result.error;
      return new Response(result.html, { status: 200, headers: publicResponseHeaders(upstream, plan) });
    } catch (error2) {
      if (error2 instanceof PreviewCompatibilityError && usesProductionRendering(plan) && !plan.searchPage) {
        return respond(plan, null, 302, { Location: plan.upstream, "X-PLL-Delivery": "google-source-fallback" });
      }
      return errorResponse(plan, usesProductionRendering(plan) ? 503 : 502);
    }
  }
  let documentContext = null;
  const identified = await options.identifySite(html, plan.site, Rewriter, {
    collectReadiness: Boolean(readinessPolicy),
    renderPlan: plan,
    onDocumentContext(context) {
      documentContext = context;
    }
  });
  if (identified !== true) return errorResponse(plan, 503);
  try {
    const rewritten = await options.rewriteDocument(html, { ...plan, readinessPolicy, documentContext }, Rewriter);
    return new Response(rewritten, { status: 200, headers: publicResponseHeaders(upstream, plan) });
  } catch (error2) {
    if (error2 instanceof PreviewCompatibilityError && usesProductionRendering(plan) && !plan.searchPage) {
      return respond(plan, null, 302, { Location: plan.upstream, "X-PLL-Delivery": "google-source-fallback" });
    }
    return errorResponse(plan, usesProductionRendering(plan) ? 503 : 502);
  }
}
async function fetchPublicPage(request, plan, options) {
  let upstream;
  const { fetchImpl } = options;
  try {
    upstream = await fetchImpl(plan.upstream, {
      method: "GET",
      redirect: "manual",
      headers: { Accept: "text/html", "Accept-Language": plan.site.language, "User-Agent": "PLL-Isolated-SEO-Preview/1.0" },
      signal: AbortSignal.timeout(2e4)
    });
    if (upstream.status === 404) return errorResponse(plan, 404, request.method);
    if (upstream.status >= 300 && upstream.status < 400) {
      if (![301, 302, 303, 307, 308].includes(upstream.status)) return errorResponse(plan, 503, request.method);
      const target = approvedSourceRedirect(upstream.headers.get("Location"), plan, request.url);
      return target ? respond(plan, null, upstream.status, { Location: target }, request.method) : errorResponse(plan, 503, request.method);
    }
    if (upstream.status !== 200 || !/^text\/html(?:;|$)/i.test(upstream.headers.get("Content-Type") ?? "")) return errorResponse(plan, 503, request.method);
    const response = await adaptPublicHtml(upstream, plan, options);
    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  } catch {
    return errorResponse(plan, 503, request.method);
  }
}
function createDeliveryHandler({
  fetchImpl = fetch,
  Rewriter,
  now = Date.now,
  pageQuota = createClientQuota({ limit: 600 }),
  searchQuota = createClientQuota({ limit: 60 }),
  identifySite = identifyPublicSite,
  rewriteDocument = rewritePageDocument
} = {}) {
  const combinedDocument = identifySite === identifyPublicSite && rewriteDocument === rewritePageDocument ? rewriteValidatedDocument : null;
  const options = { fetchImpl, Rewriter, identifySite, rewriteDocument, combinedDocument };
  return async (request) => {
    const plan = planDeliveryRequest(request.url, request.method);
    const utility = utilityResponse(request, plan);
    if (utility) return utility;
    if (plan.kind === "search-post") return relayDeliverySearch(
      request,
      plan,
      { fetchImpl, quota: (time) => searchQuota(request, time), now }
    );
    const quota = plan.searchPage ? searchQuota : pageQuota;
    if (!quota(request, now())) return errorResponse(plan, 429, request.method);
    return fetchPublicPage(request, plan, options);
  };
}
var handler2 = createDeliveryHandler();

// src/boundary.js
var RENDERER_SHA256 = "58a76f2dd366fb20b03ebb9db9f0dd401df51ef10186959a96d844285c38e509";
var RELEASE_ID = "pll-durable-free-20261103-v1";
var PREVIEW_DOMAIN2 = "pll-seo-preview-20261102.pages.dev";
var PRODUCTION_HOSTS = new Set(["www", "en", "fr", "it"].map((label) => `${label}.panamalegallab.com`));
var encoder2 = new TextEncoder();
function isPreview(host) {
  if (host === PREVIEW_DOMAIN2) return true;
  if (!host.endsWith(`.${PREVIEW_DOMAIN2}`)) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(host.slice(0, -PREVIEW_DOMAIN2.length - 1));
}
function unsafePath2(input) {
  const raw = input.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i)?.[1] ?? "";
  if (/[\\\u0000-\u001f\u007f-\u009f]/u.test(raw) || /%(?:2f|5c|2e|25)/i.test(raw) || raw.split("/").some((part) => part === "." || part === "..")) return true;
  try {
    return /[\\\u0000-\u001f\u007f-\u009f\ud800-\udfff]/u.test(decodeURIComponent(raw));
  } catch {
    return true;
  }
}
function requestBoundary(request) {
  const input = request.url;
  let url;
  try {
    url = new URL(input);
  } catch {
    return { allowed: false, preview: false, status: 400 };
  }
  const preview = isPreview(url.hostname);
  const context = { preview };
  if (!PRODUCTION_HOSTS.has(url.hostname) && !preview || url.port) return { ...context, allowed: false, status: 421 };
  if (encoder2.encode(input).byteLength > 8192 || encoder2.encode(url.pathname).byteLength > 4096)
    return { ...context, allowed: false, status: 414 };
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || unsafePath2(input))
    return { ...context, allowed: false, status: 400 };
  return { ...context, allowed: true };
}
function boundaryResponse(context, method = "GET", status = context.status) {
  const temporary = status >= 500;
  return new Response(method === "HEAD" ? null : temporary ? "This page is temporarily unavailable. Please try again shortly." : "Request not available.", {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Type": "text/plain; charset=utf-8",
      ...context.preview ? { "X-Robots-Tag": "noindex, nofollow" } : {},
      ...temporary ? { "Retry-After": "60" } : {}
    }
  });
}
var temporaryResponse = (context, method) => boundaryResponse(context, method, 503);
function backendNotFound(method) {
  return new Response(method === "HEAD" ? null : "Not found.", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Type": "text/plain; charset=utf-8" }
  });
}
function withBackendVersion(response, env) {
  const supplied = env?.CF_VERSION_METADATA?.id;
  const version = typeof supplied === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(supplied) ? supplied : RELEASE_ID;
  const headers3 = new Headers(response.headers);
  headers3.set("X-PLL-Backend-Version", version);
  headers3.set("X-PLL-RendererSha256", RENDERER_SHA256);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: headers3 });
}

// src/body-slot.js
var BODY_DEADLINE_MS = 3e4;
function holdResponseSlot(response, release, timing = globalThis) {
  if (!response.body) {
    release();
    return response;
  }
  const reader = response.body.getReader();
  let finished = false, timer;
  const finish = () => {
    if (finished) return false;
    finished = true;
    timing.clearTimeout(timer);
    release();
    return true;
  };
  const body = new ReadableStream({
    start(controller) {
      timer = timing.setTimeout(() => {
        if (!finish()) return;
        controller.error(new Error("Response delivery deadline exceeded."));
        reader.cancel().catch(() => {
        });
      }, BODY_DEADLINE_MS);
      timer?.unref?.();
    },
    async pull(controller) {
      try {
        const chunk = await reader.read();
        if (finished) return;
        if (chunk.done) {
          finish();
          controller.close();
        } else controller.enqueue(chunk.value);
      } catch (error2) {
        if (finish()) controller.error(error2);
      }
    },
    async cancel(reason) {
      if (finish()) await reader.cancel(reason);
    }
  }, { highWaterMark: 0 });
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

// src/image-profiles.js
var IMAGE_PROFILES = Object.freeze([
  {
    "language": "es",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamalegallab",
    "sectionId": "h.a7b918ebd00823c_757",
    "widgetId": "h.77306695899439f3_18",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Proceso de trabajo de Panama Legal Lab para servicios legales en Panam\xE1: evaluaci\xF3n inicial, revisi\xF3n de viabilidad, preparaci\xF3n documental, coordinaci\xF3n profesional y seguimiento.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "en",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-en",
    "sectionId": "h.43b40caf9fe02fb7_0",
    "widgetId": "h.43b40caf9fe02fb7_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "How Panama Legal Lab works for legal services in Panama, including initial assessment, viability review, document preparation, professional coordination, and follow-up.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "fr",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-fr",
    "sectionId": "h.4667e1d775b5d54b_0",
    "widgetId": "h.4667e1d775b5d54b_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Processus de travail de Panama Legal Lab pour les services juridiques au Panama : \xE9valuation du dossier, analyse de faisabilit\xE9, pr\xE9paration documentaire, coordination professionnelle et suivi.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "it",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-it",
    "sectionId": "h.10e59a42a351e986_0",
    "widgetId": "h.10e59a42a351e986_12",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Processo di lavoro di Panama Legal Lab per servizi legali a Panama: valutazione iniziale, analisi di fattibilit\xE0, preparazione documentale, coordinamento professionale e follow-up.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/"
  },
  {
    "language": "es",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamalegallab",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requisitos para abrir una cuenta bancaria corporativa en Panam\xE1.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/nuestros-servicios-en-panama/cuenta-bancaria-en-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "en",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-en",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requirements to open a corporate bank account in Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/our-services-in-panama/bank-account-in-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "fr",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-fr",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Conditions pour ouvrir un compte bancaire soci\xE9t\xE9 au Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/nos-services-au-panama/compte-bancaire-au-panama",
    "kind": "bank-corporate"
  },
  {
    "language": "it",
    "dataDomain": "panamalegallab.com",
    "dataSiteName": "panamlegallab-it",
    "sectionId": "h.b6ffd859b1bde5a_755",
    "widgetId": "h.a7b918ebd00823c_143",
    "imageClass": "CENy8b",
    "imageRole": "img",
    "imageAlt": "Requisiti per aprire un conto bancario societario a Panama.",
    "sourceSuffix": "=w1280",
    "hasSrcset": false,
    "canonicalPath": "/i-nostri-servizi-a-panama/conto-bancario-a-panama",
    "kind": "bank-corporate"
  }
].map((profile) => Object.freeze(profile)));

// src/image-helpers.js
var CDN = "https://lh7-us.googleusercontent.com/sitesv-images-rt/";
var noncePattern = /^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
var safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
function approvedProcessUrl(value) {
  if (typeof value !== "string" || value.length > 4096 || !value.startsWith(CDN) || !/^[A-Za-z0-9_-]+=w1280$/u.test(value.slice(CDN.length))) return null;
  try {
    const url = new URL(value);
    return url.href === value && !url.port && !url.username && !url.password && !url.search && !url.hash ? value : null;
  } catch {
    return null;
  }
}
function representations(url) {
  return [url, url.replaceAll("/", "\\/")].flatMap((value) => ["=", "\\u003d", "\\u003D", "\\x3d", "\\x3D"].map((equals) => value.replace("=", equals)));
}
function rewriteReferences(html, original) {
  if (!approvedProcessUrl(original)) return null;
  const token = original.slice(CDN.length, -"=w1280".length);
  const matches = [];
  for (const form of representations(original)) {
    let from = 0, at;
    while ((at = html.indexOf(form, from)) !== -1) {
      const end = at + form.length;
      const right = html[end];
      const safeRight = right && (/[\s"')<>]/u.test(right) || right === "\\" && /["']/u.test(html[end + 1] ?? ""));
      if (at && !/[\s"'(=<>]/u.test(html[at - 1]) || !safeRight) return null;
      matches.push({ start: at, end });
      from = end;
      if (matches.length > 64) return null;
    }
  }
  if (!matches.length) return null;
  const classified = html.replace(
    /\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})|\\\//giu,
    (match, braced, unicode, hex) => {
      if (match === "\\/") return "/";
      const code = parseInt(braced ?? unicode ?? hex, 16);
      return code <= 127 ? String.fromCharCode(code) : match;
    }
  );
  let semanticCount = 0;
  for (let at = classified.indexOf(token); at !== -1; at = classified.indexOf(token, at + token.length)) semanticCount++;
  if (semanticCount !== matches.length) return null;
  for (let at = html.indexOf(token); at !== -1; at = html.indexOf(token, at + token.length)) {
    if (!matches.some((span) => at >= span.start && at + token.length <= span.end)) return null;
  }
  for (const match of html.matchAll(/sitesv-images-rt(?:\/|\\\/)([^"'<>\s)]{1,4096})/gu)) {
    const decoded = match[1].replace(
      /\\u00([0-9a-f]{2})|\\x([0-9a-f]{2})/giu,
      (_, unicode, hex) => String.fromCharCode(parseInt(unicode ?? hex, 16))
    );
    if (decoded.includes(token) && !matches.some((span) => match.index >= span.start && match.index < span.end)) return null;
  }
  let result = html;
  for (const { end } of matches.sort((a, b) => b.start - a.start)) result = result.slice(0, end) + "-rw" + result.slice(end);
  return result;
}
function authorizedNonce(csp, nonces) {
  const unique = [...new Set(nonces)];
  if (unique.length !== 1 || !noncePattern.test(unique[0]) || typeof csp !== "string" || !csp.length || csp.length > 16384 || /[\u0000-\u001f\u007f]/u.test(csp)) return null;
  for (const policy of csp.split(",")) {
    const directives = /* @__PURE__ */ new Map();
    for (const raw of policy.split(";")) {
      const values = raw.trim().split(/\s+/u);
      const name = values.shift()?.toLowerCase();
      if (!name) continue;
      if (!/^[a-z][a-z-]*$/u.test(name) || directives.has(name)) return null;
      directives.set(name, values);
    }
    if (directives.has("sandbox") && !directives.get("sandbox").includes("allow-scripts")) return null;
    const effective = directives.get("script-src-elem") ?? directives.get("script-src") ?? directives.get("default-src");
    if (!effective?.includes(`'nonce-${unique[0]}'`)) return null;
  }
  return unique[0];
}
function fallbackScript(original, variant) {
  return `(()=>{const o=${safeJson(original)},v=${safeJson(variant)},seen=new WeakSet;document.addEventListener('error',e=>{const n=e.target;if(!n||n.tagName!=='IMG'||seen.has(n)||(n.getAttribute('src')!==v&&n.currentSrc!==v))return;seen.add(n);n.setAttribute('src',o)},true)})();`;
}
function insertFallback(html, script, nonce) {
  if (!noncePattern.test(nonce)) return null;
  const heads = [...html.matchAll(/<head(?:\s[^<>]*)?>/giu)];
  if (heads.length !== 1 || /["']/u.test(heads[0][0])) return null;
  const end = heads[0].index + heads[0][0].length;
  return html.slice(0, end) + `<script nonce="${nonce}" data-pll-image-fallback="v1">${script}<\/script>` + html.slice(end);
}

// src/image-format.js
var IMAGE_BODY_LIMIT = 1310720;
var IMAGE_DEADLINE_MS = 1e3;
var IMAGE_PREVIEW_ORIGIN = "https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev";
var utf8Html = /^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
var encoder3 = new TextEncoder();
function eligibleProfile(request, mode) {
  if (request.method !== "GET" || !["preview", "all"].includes(mode)) return null;
  const plan = planDeliveryRequest(request.url, request.method);
  if (plan.kind !== "page" || plan.searchPage) return null;
  const profile = IMAGE_PROFILES.find((value) => value.language === plan.site.language && plan.canonical === plan.site.productionOrigin + value.canonicalPath);
  if (!profile) return null;
  if (plan.mode === "production") return mode === "all" ? profile : null;
  return plan.previewOrigin === IMAGE_PREVIEW_ORIGIN && new URL(request.url).searchParams.get("_pll_speed") !== "control" ? profile : null;
}
function visible(element) {
  const style = element.getAttribute("style") ?? "";
  return style.length <= 8192 && !/[\\\u0000-\u001f]|\/\*/u.test(style) && !/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|content-visibility\s*:\s*hidden)\b/iu.test(style) && element.getAttribute("hidden") === null && element.getAttribute("aria-hidden")?.trim().toLowerCase() !== "true";
}
function createImageInspector(profile) {
  let state = {
    html: 0,
    head: 0,
    body: 0,
    root: 0,
    section: 0,
    widget: 0,
    marker: 0,
    charset: 0,
    image: 0,
    safe: true,
    url: null,
    nonces: []
  };
  const count = (name) => ({ element(element) {
    state = { ...state, [name]: state[name] + 1, safe: state.safe && visible(element) };
  } });
  return {
    ...Object.fromEntries(["html", "head", "body", "root", "section", "widget"].map((name) => [name, count(name)])),
    ancestor: { element(element) {
      state = { ...state, safe: state.safe && visible(element) };
    } },
    beforeImage: { element() {
      state = { ...state, safe: state.safe && state.head === 1 };
    } },
    marker: { element(element) {
      state = { ...state, marker: state.marker + 1, safe: state.safe && element.getAttribute("data-domain") === profile.dataDomain && element.getAttribute("data-sitename") === profile.dataSiteName };
    } },
    charset: { element(element) {
      state = { ...state, charset: state.charset + 1, safe: state.safe && /^utf-?8$/iu.test(element.getAttribute("charset") ?? "") };
    } },
    meta: { element(element) {
      if (element.getAttribute("http-equiv")?.toLowerCase() === "content-security-policy") state = { ...state, safe: false };
    } },
    script: { element(element) {
      const nonce = element.getAttribute("nonce");
      const dataOnly = ["application/json", "application/ld+json"].includes(element.getAttribute("type")?.trim().toLowerCase());
      const authorizedShape = nonce !== null || element.getAttribute("src") !== null || dataOnly;
      state = { ...state, safe: state.safe && authorizedShape };
      if (nonce !== null) state = { ...state, nonces: [...state.nonces, nonce], safe: state.safe && state.nonces.length < 256 };
    } },
    image: { element(element) {
      const url = approvedProcessUrl(element.getAttribute("src"));
      state = {
        ...state,
        image: state.image + 1,
        url,
        safe: state.safe && visible(element) && Boolean(url) && element.getAttribute("srcset") === null && (element.getAttribute("class") ?? "").split(/\s+/u).includes(profile.imageClass) && element.getAttribute("role") === profile.imageRole && element.getAttribute("alt") === profile.imageAlt
      };
    } },
    result() {
      return ["html", "head", "body", "root", "section", "widget", "marker", "charset", "image"].every((name) => state[name] === 1) && state.safe ? { url: state.url, nonces: state.nonces } : null;
    }
  };
}
function attach(rewriter, inspector, profile) {
  const section = `section[id="${profile.sectionId}"]`;
  const widget = `[id="${profile.widgetId}"]`;
  return rewriter.on("html", inspector.html).on("head", inspector.head).on("body", inspector.body).on("div.UtePc", inspector.root).on(section, inspector.section).on(widget, inspector.widget).on(`div.UtePc > ${section} ${widget} img`, inspector.image).on(`${section} div`, inspector.ancestor).on("[data-domain][data-sitename]", inspector.marker).on("head meta[charset]", inspector.charset).on("meta[http-equiv]", inspector.meta).on("script", inspector.script).on("img", inspector.beforeImage);
}
function cancelQuietly(reader) {
  try {
    reader?.cancel().catch(() => {
    });
  } catch {
  }
}
async function readBounded(reader) {
  let size = 0;
  const chunks = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > IMAGE_BODY_LIMIT) return null;
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
async function inspectResponse(response, profile, Rewriter, timing) {
  let sourceReader, parserReader, timer, aborted = false;
  const deadline = new Promise((resolve) => {
    timer = timing.setTimeout(() => {
      aborted = true;
      resolve(null);
    }, IMAGE_DEADLINE_MS);
    timer?.unref?.();
  });
  try {
    sourceReader = response.clone().body.getReader();
    const inspection = (async () => {
      const bytes = await readBounded(sourceReader);
      if (!bytes || aborted) return null;
      const html = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      const roundtrip = encoder3.encode(html);
      if (roundtrip.length !== bytes.length || !roundtrip.every((value, index) => value === bytes[index])) return null;
      const inspector = createImageInspector(profile);
      parserReader = attach(new Rewriter(), inspector, profile).transform(new Response(bytes)).body.getReader();
      while (!(await parserReader.read()).done) {
        if (aborted) return null;
      }
      if (aborted) return null;
      const selected = inspector.result();
      if (!selected) return null;
      const nonce = authorizedNonce(response.headers.get("Content-Security-Policy"), selected.nonces);
      if (!nonce) return null;
      const rewritten = rewriteReferences(html, selected.url);
      if (!rewritten) return null;
      const script = fallbackScript(selected.url, selected.url + "-rw");
      const result = insertFallback(rewritten, script, nonce);
      return result ? encoder3.encode(result) : null;
    })();
    return await Promise.race([inspection, deadline]);
  } catch {
    return null;
  } finally {
    aborted = true;
    timing.clearTimeout(timer);
    cancelQuietly(parserReader);
    cancelQuietly(sourceReader);
  }
}
async function withImageFormat(response, request, environment, options = {}) {
  try {
    if (response.status !== 200 || !response.body || response.headers.has("Content-Encoding") || !utf8Html.test(response.headers.get("Content-Type") ?? "")) return response;
    const profile = eligibleProfile(request, environment?.PLL_IMAGE_FORMAT);
    if (!profile) return response;
    const policy = profile.kind === void 0 ? "process-webp-v1" : profile.kind === "bank-corporate" ? "bank-corporate-webp-v1" : null;
    if (!policy) return response;
    const Rewriter = options.Rewriter ?? globalThis.HTMLRewriter;
    if (typeof Rewriter !== "function") return response;
    const bytes = await inspectResponse(response, profile, Rewriter, options.timing ?? globalThis);
    if (!bytes) return response;
    const headers3 = new Headers(response.headers);
    for (const name of ["Content-Length", "ETag", "Content-MD5", "Digest", "Content-Digest", "Repr-Digest"]) headers3.delete(name);
    headers3.set("X-PLL-Image-Policy", `${policy}-${profile.language}`);
    const delivered = new Response(bytes, { status: response.status, statusText: response.statusText, headers: headers3 });
    try {
      response.body.cancel().catch(() => {
      });
    } catch {
    }
    return delivered;
  } catch {
    return response;
  }
}

// src/css-static.js
var CSS_NATIVE_URL = "https://www.gstatic.com/_/atari/_/ss/k=atari.vw.VWOdPCMSEos.L.X.O/am=AAAAGAAE/d=1/rs=AGEqA5kDZG7hRoGssZU386DkZtLorCpeeA";
var CSS_ASSET_PATH = "/_pll-assets/sites-7b109cc5f097872edf3be1cfb1a39cba4a086286963af0eb2cddaf2082e68d61.css";
var CSS_BODY_LIMIT = 1310720;
var CSS_DEADLINE_MS = 1e3;
var PREVIEW = "https://recovery-prodlike-20261103.pll-seo-preview-20261102.pages.dev";
var utf8Html2 = /^text\/html\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8)\s*$/iu;
var noncePattern2 = /^[A-Za-z0-9+/_-]{8,256}={0,2}$/u;
var encoder4 = new TextEncoder();
function eligibleSite(request, mode) {
  if (request.method !== "GET" || !["preview", "all"].includes(mode)) return null;
  const plan = planDeliveryRequest(request.url, request.method);
  if (plan.kind !== "page" || plan.searchPage) return null;
  if (plan.mode === "production") return mode === "all" ? plan.site : null;
  return plan.previewOrigin === PREVIEW && new URL(request.url).searchParams.get("_pll_speed") !== "control" ? plan.site : null;
}
function stylePolicyAbsent(csp) {
  return typeof csp === "string" && csp.length > 0 && !csp.split(",").some((policy) => policy.split(";").some((raw) => /^(?:default-src|style-src(?:-elem|-attr)?)$/iu.test(raw.trim().split(/\s+/u)[0])));
}
function approvedLink(get) {
  return get("href") === CSS_NATIVE_URL && get("data-id") === "_cl" && get("rel")?.toLowerCase() === "stylesheet" && noncePattern2.test(get("nonce") ?? "") && get("integrity") === null;
}
function createCssInspector(site) {
  let state = { html: 0, head: 0, body: 0, marker: 0, charset: 0, links: 0, selected: 0, safe: true, nonces: [] };
  const count = (name) => ({ element() {
    state = { ...state, [name]: state[name] + 1 };
  } });
  return {
    ...Object.fromEntries(["html", "head", "body"].map((name) => [name, count(name)])),
    base: { element() {
      state = { ...state, safe: false };
    } },
    marker: { element(element) {
      state = { ...state, marker: state.marker + 1, safe: state.safe && element.getAttribute("data-domain") === "panamalegallab.com" && element.getAttribute("data-sitename") === site.upstreamPrefix.split("/").at(-1) };
    } },
    charset: { element(element) {
      state = { ...state, charset: state.charset + 1, safe: state.safe && /^utf-?8$/iu.test(element.getAttribute("charset") ?? "") };
    } },
    meta: { element(element) {
      if (/^content-security-policy(?:-report-only)?$/iu.test(element.getAttribute("http-equiv")?.trim() ?? "")) state = { ...state, safe: false };
    } },
    script: { element(element) {
      const nonce = element.getAttribute("nonce");
      const dataOnly = ["application/json", "application/ld+json"].includes(element.getAttribute("type")?.trim().toLowerCase());
      state = { ...state, safe: state.safe && (nonce !== null || element.getAttribute("src") !== null || dataOnly) };
      if (nonce !== null) state = { ...state, nonces: [...state.nonces, nonce], safe: state.safe && state.nonces.length < 256 };
    } },
    link: { element(element) {
      if (element.getAttribute("data-id") === "_cl") state = { ...state, links: state.links + 1 };
    } },
    headLink: { element(element) {
      if (element.getAttribute("data-id") === "_cl") state = {
        ...state,
        selected: state.selected + 1,
        safe: state.safe && approvedLink((name) => element.getAttribute(name))
      };
    } },
    result() {
      return state.safe && ["html", "head", "body", "marker", "charset", "links", "selected"].every((name) => state[name] === 1) ? state.nonces : null;
    }
  };
}
function attach2(rewriter, inspector) {
  return rewriter.on("html", inspector.html).on("head", inspector.head).on("body", inspector.body).on("base", inspector.base).on("[data-domain][data-sitename]", inspector.marker).on("head meta[charset]", inspector.charset).on("meta[http-equiv]", inspector.meta).on("script", inspector.script).on("link", inspector.link).on("head link", inspector.headLink);
}
function cssFallbackScript() {
  return `(()=>{const o=${JSON.stringify(CSS_NATIVE_URL)},v=${JSON.stringify(CSS_ASSET_PATH)},seen=new WeakSet;document.addEventListener('error',e=>{const n=e.target;if(!n||n.tagName!=='LINK'||seen.has(n)||n.getAttribute('rel')?.toLowerCase()!=='stylesheet'||n.getAttribute('data-id')!=='_cl'||(n.getAttribute('href')!==v&&n.href!==document.location.origin+v))return;seen.add(n);n.setAttribute('href',o)},true)})();`;
}
function linkAttributes(tag) {
  const attrs = /* @__PURE__ */ new Map();
  let rest = tag.slice(5, -1), offset = 5;
  while (rest.length) {
    if (/^\s*\/?\s*$/u.test(rest)) break;
    const match = /^\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)'))?/iu.exec(rest);
    if (!match) return null;
    const name = match[1].toLowerCase();
    if (attrs.has(name)) return null;
    const value = match[2] ?? match[3] ?? "";
    const valueAt = match[0].indexOf("=");
    attrs.set(name, { value, start: offset + (valueAt < 0 ? match[0].length : match[0].search(/["']/u) + 1), length: value.length });
    offset += match[0].length;
    rest = rest.slice(match[0].length);
  }
  return attrs;
}
function inertSpans(html) {
  const lower = html.replace(/[A-Z]/gu, (letter) => letter.toLowerCase()), spans = [];
  const starts = /<!--|<(script|style|title|textarea|xmp|iframe|noembed|noframes|noscript)\b[^<>]*>/giu;
  let match;
  while ((match = starts.exec(html)) !== null) {
    let end;
    if (match[0] === "<!--") {
      const close = html.indexOf("-->", starts.lastIndex);
      if (close < 0) return null;
      end = close + 3;
    } else {
      const name = match[1].toLowerCase(), close = lower.indexOf("</" + name, starts.lastIndex);
      if (close < 0) return null;
      const closing = /^<\/[a-z]+\s*>/iu.exec(html.slice(close, close + 256));
      if (!closing || !closing[0].toLowerCase().startsWith("</" + name) || !/^\s*>$/u.test(closing[0].slice(name.length + 2))) return null;
      end = close + closing[0].length;
    }
    spans.push({ start: match.index, end });
    starts.lastIndex = end;
  }
  return spans;
}
function spliceCssLink(html, nonce) {
  if (!noncePattern2.test(nonce)) return null;
  const heads = [...html.matchAll(/<head(?:\s[^<>]*)?>/giu)], ends = [...html.matchAll(/<\/head\s*>/giu)];
  if (heads.length !== 1 || ends.length !== 1 || /["']/u.test(heads[0][0])) return null;
  const begin = heads[0].index + heads[0][0].length, end = ends[0].index;
  if (begin >= end) return null;
  const inert = inertSpans(html);
  if (!inert) return null;
  const candidates = [];
  for (const match of html.matchAll(/<link\b[^<>]*>/giu)) {
    const attrs = linkAttributes(match[0]);
    if (!attrs) return null;
    if (attrs.get("data-id")?.value !== "_cl") continue;
    if (match.index < begin || match.index >= end || inert.some((span2) => match.index >= span2.start && match.index < span2.end) || !approvedLink((name) => attrs.get(name)?.value ?? null)) return null;
    const href = attrs.get("href");
    candidates.push({ start: match.index + href.start, end: match.index + href.start + href.length });
  }
  if (candidates.length !== 1) return null;
  const span = candidates[0];
  const rewritten = html.slice(0, span.start) + CSS_ASSET_PATH + html.slice(span.end);
  return rewritten.slice(0, begin) + `<script nonce="${nonce}" data-pll-css-fallback="v1">${cssFallbackScript()}<\/script>` + rewritten.slice(begin);
}
function cancelQuietly2(reader) {
  try {
    reader?.cancel().catch(() => {
    });
  } catch {
  }
}
async function readBounded2(reader) {
  let size = 0;
  const chunks = [];
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > CSS_BODY_LIMIT) return null;
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
async function inspect(response, site, Rewriter, timing) {
  let sourceReader, parserReader, timer, aborted = false;
  const deadline = new Promise((resolve) => {
    timer = timing.setTimeout(() => {
      aborted = true;
      resolve(null);
    }, CSS_DEADLINE_MS);
    timer?.unref?.();
  });
  try {
    sourceReader = response.clone().body.getReader();
    const inspection = (async () => {
      const bytes = await readBounded2(sourceReader);
      if (!bytes || aborted) return null;
      const html = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      const roundtrip = encoder4.encode(html);
      if (roundtrip.length !== bytes.length || !roundtrip.every((value, index) => value === bytes[index])) return null;
      const inspector = createCssInspector(site);
      parserReader = attach2(new Rewriter(), inspector).transform(new Response(bytes)).body.getReader();
      while (!(await parserReader.read()).done) {
        if (aborted) return null;
      }
      if (aborted) return null;
      const nonces = inspector.result();
      if (!nonces) return null;
      const nonce = authorizedNonce(response.headers.get("Content-Security-Policy"), nonces);
      if (!nonce) return null;
      const result = spliceCssLink(html, nonce);
      return result ? encoder4.encode(result) : null;
    })();
    return await Promise.race([inspection, deadline]);
  } catch {
    return null;
  } finally {
    aborted = true;
    timing.clearTimeout(timer);
    cancelQuietly2(parserReader);
    cancelQuietly2(sourceReader);
  }
}
async function withCssStatic(response, request, environment, options = {}) {
  try {
    if (response.status !== 200 || !response.body || response.headers.has("Content-Encoding") || !utf8Html2.test(response.headers.get("Content-Type") ?? "") || !stylePolicyAbsent(response.headers.get("Content-Security-Policy"))) return response;
    const site = eligibleSite(request, environment?.PLL_CSS_STATIC);
    if (!site) return response;
    const Rewriter = options.Rewriter ?? globalThis.HTMLRewriter;
    if (typeof Rewriter !== "function") return response;
    const bytes = await inspect(response, site, Rewriter, options.timing ?? globalThis);
    if (!bytes) return response;
    const headers3 = new Headers(response.headers);
    for (const name of ["Content-Length", "ETag", "Content-MD5", "Digest", "Content-Digest", "Repr-Digest"]) headers3.delete(name);
    headers3.set("X-PLL-CSS-Policy", `static-exact-v1-${site.language}`);
    const delivered = new Response(bytes, { status: response.status, statusText: response.statusText, headers: headers3 });
    try {
      response.body.cancel().catch(() => {
      });
    } catch {
    }
    return delivered;
  } catch {
    return response;
  }
}

// src/backend-core.js
var MAX_IN_FLIGHT = 8;
function createRendererClass(Base, makeHandler) {
  return class extends Base {
    constructor(ctx, env) {
      super(ctx, env);
      this.environment = env;
      this.handle = makeHandler();
      this.inFlight = 0;
    }
    async fetch(request) {
      const boundary = requestBoundary(request);
      if (!boundary.allowed) return withBackendVersion(boundaryResponse(boundary, request.method), this.environment);
      if (this.inFlight >= MAX_IN_FLIGHT)
        return withBackendVersion(temporaryResponse(boundary, request.method), this.environment);
      this.inFlight += 1;
      const release = () => {
        this.inFlight -= 1;
      };
      try {
        const rendered = await this.handle(request);
        const images = await withImageFormat(rendered, request, this.environment);
        const delivered = await withCssStatic(images, request, this.environment);
        return holdResponseSlot(withBackendVersion(delivered, this.environment), release);
      } catch {
        release();
        return withBackendVersion(temporaryResponse(boundary, request.method), this.environment);
      }
    }
  };
}

// src/backend.js
var PllRenderer = class extends createRendererClass(DurableObject, createDeliveryHandler) {
};
var backend_default = { fetch: (request) => backendNotFound(request.method) };
export {
  PllRenderer,
  backend_default as default
};
