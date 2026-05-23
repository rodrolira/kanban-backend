// Declaración de tipos para xss-clean
declare module 'xss-clean' {
    import { RequestHandler } from 'express';
    
    // xss-clean es un middleware de Express
    const xssClean: () => RequestHandler;
    
    export default xssClean;
  }