module.exports = {
  apps: [
    {
      name: "lan-os",
      script: "node",
      args: "packages/server/dist/index.js",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "logs/lan-os-error.log",
      out_file: "logs/lan-os-out.log",
      log_file: "logs/lan-os-combined.log",
      time: true,
    },
  ],
};
