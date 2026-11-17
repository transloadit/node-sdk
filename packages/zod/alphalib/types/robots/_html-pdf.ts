/** Shared English contract for the HTML-to-PDF capture used by both conversion Robots. */
export const htmlPdfReadinessDescription =
  'For HTML-to-PDF output, printing starts once sampled visible frames, their documents, and their fonts have stayed ready for 500 ms. After navigation, PDF readiness has a 30-second cap; a page that does not become ready fails conversion. Hidden frames do not extend the ready interval. Content that first appears during the final sample window may be missed. Prepare dynamic content before capture.'
