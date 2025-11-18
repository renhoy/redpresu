/**
 * PM2 Ecosystem Configuration
 *
 * Configuración de PM2 para deployment en producción de redpresu
 *
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 restart redpresu
 *   pm2 stop redpresu
 *   pm2 logs redpresu
 *   pm2 monit
 *
 * Documentación: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      // Nombre de la aplicación
      name: 'redpresu',

      // Script a ejecutar (npm start ejecuta next start)
      script: 'npm',
      args: 'start',

      // Directorio de trabajo (cambiar si es necesario)
      cwd: '/opt/redpresu',

      // Número de instancias
      // 1 = single instance
      // 'max' = usa todos los CPU cores disponibles (cluster mode)
      instances: 1,

      // Modo de ejecución
      // 'fork' = modo single instance
      // 'cluster' = modo multi-instance (requiere instances > 1)
      exec_mode: 'fork',

      // Reiniciar automáticamente si la app crashea
      autorestart: true,

      // Watch files for changes (false en producción)
      watch: false,

      // Reiniciar si el uso de memoria excede este límite
      max_memory_restart: '1G',

      // Variables de entorno
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Variables de entorno para modo staging (opcional)
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },

      // Archivos de logs
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Merge logs (todos los logs en un archivo)
      merge_logs: true,

      // Delay entre reinicios si hay crash loop (ms)
      restart_delay: 4000,

      // Número máximo de reintentos en crash loop
      max_restarts: 10,

      // Tiempo en minutos para resetear contador de restarts
      min_uptime: '10s',

      // Exponer métricas para PM2 Plus (opcional)
      // Descomentar si usas pm2 plus
      // instance_var: 'INSTANCE_ID',
      // pmx: true,

      // Kill timeout (tiempo para hacer graceful shutdown)
      kill_timeout: 5000,

      // Wait ready (esperar señal ready del app)
      wait_ready: false,

      // Listen timeout
      listen_timeout: 10000,

      // Cron para reiniciar app (opcional)
      // Ejemplo: reiniciar cada día a las 4am
      // cron_restart: '0 4 * * *',

      // Configuración avanzada (opcional)
      // node_args: '--max-old-space-size=2048', // Aumentar heap de Node.js

      // Ignore watch (si watch: true)
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        'public/pdfs',
        'public/logos',
      ],

      // Time de espera antes de forzar reload (ms)
      // Si no responde después de este tiempo, se hace kill -9
      shutdown_with_message: false,
    },
  ],

  /**
   * Configuración de deployment (opcional)
   *
   * Permite hacer deploy remoto con: pm2 deploy production
   *
   * Documentación: https://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy: {
    production: {
      // Usuario SSH
      user: 'ubuntu',

      // Host del servidor (cambiar por tu IP/dominio)
      host: ['192.168.1.100'],

      // Puerto SSH
      // port: 22,

      // Branch de git a deployar
      ref: 'origin/main',

      // Repositorio git
      repo: 'git@github.com:tu-usuario/redpresu.git',

      // Path en el servidor donde se clonará el repo
      path: '/opt/redpresu',

      // Comandos SSH pre-deploy (antes de git pull)
      'pre-deploy-local': '',

      // Comandos a ejecutar en el servidor después de git pull
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',

      // Comandos pre-setup (primera vez)
      'pre-setup': '',

      // Variables de entorno para deployment
      env: {
        NODE_ENV: 'production',
      },
    },

    staging: {
      user: 'ubuntu',
      host: ['192.168.1.101'],
      ref: 'origin/develop',
      repo: 'git@github.com:tu-usuario/redpresu.git',
      path: '/opt/redpresu-staging',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};
