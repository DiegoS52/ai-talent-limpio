<template>
    <div id="soofia-container"></div>
</template>

<script>
export default {
    name: 'SoofiaBot',
    mounted() {
        console.log('Iniciando carga de Soofia Bot...');
        
        // Obtener la configuración del widget
        const baseUrl = 'https://api.soofia.app';
        const param1 = '0425aa2d6b0d46daa699cd81d99e0894';

        fetch(`${baseUrl}/api/v1/other/h/${param1}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Configuración del widget cargada:', data);
            this.initializeWidget(data);
        })
        .catch(error => {
            console.error('Error al cargar la configuración del widget:', error);
        });
    },
    methods: {
        async initializeWidget(data) {
            // Configurar objeto de configuración global
            window.soofiaConfig = {
                frontUrl: 'https://superadmin.soofia.app',
                environment: 'production',
                hash: '0425aa2d6b0d46daa699cd81d99e0894',
                container: 'soofia-container',
                autoInit: true,
                debug: true,
                // Agregar la configuración del bot
                botConfig: data
            };

            console.log('Configuración establecida:', window.soofiaConfig);

            // Cargar CSS primero
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = `${window.soofiaConfig.frontUrl}/css/widget.css`;
            cssLink.onload = () => {
                console.log('CSS cargado correctamente');
                this.loadScript();
            };
            cssLink.onerror = (error) => {
                console.error('Error al cargar CSS:', error);
            };
            document.head.appendChild(cssLink);
        },

        loadScript() {
            console.log('Cargando script del widget...');
            const script = document.createElement('script');
            script.src = `${window.soofiaConfig.frontUrl}/scripts/widget.js?h=${window.soofiaConfig.hash}`;
            
            script.onload = () => {
                console.log('Script cargado correctamente');
                // Verificar si el widget se creó
                setTimeout(() => {
                    const widget = document.getElementById('soofia-chatbot');
                    if (widget) {
                        console.log('Widget creado correctamente');
                    } else {
                        console.error('Widget no encontrado después de cargar el script');
                        // Intentar inicializar manualmente
                        if (window.SoofiaWidget && typeof window.SoofiaWidget.init === 'function') {
                            console.log('Intentando inicialización manual...');
                            window.SoofiaWidget.init();
                        }
                    }
                }, 1000);
            };
            
            script.onerror = (error) => {
                console.error('Error al cargar el script:', error);
            };
            
            document.body.appendChild(script);
        }
    },
    unmounted() {
        console.log('Desmontando widget...');
        const chatbot = document.getElementById('soofia-chatbot');
        if (chatbot) {
            chatbot.remove();
            console.log('Widget removido');
        }
        // Limpiar todo
        delete window.soofiaConfig;
        delete window.SoofiaWidget;
        console.log('Configuración limpiada');
    }
}
</script>

<style scoped>
#soofia-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    width: 60px;
    height: 60px;
    display: block;
}
</style>