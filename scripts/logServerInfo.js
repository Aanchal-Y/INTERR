const os = require('os');

function getLocalIPAddress() {
	const interfaces = os.networkInterfaces();
	for (const name of Object.keys(interfaces)) {
		for (const iface of interfaces[name]) {
			if (iface.family === 'IPv4' && !iface.internal) {
				return iface.address;
			}
		}
	}
	return 'localhost';
}

function logServerInfo() {
	const ip = getLocalIPAddress();
	console.log('\n');
	console.log('═════════════════════════════════════════════');
	console.log('INTERR Dev Server is running at:');
	console.log('═════════════════════════════════════════════');
	console.log(`Loopback:  https://localhost:8080/`);
	console.log(`Network:   https://${ip}:8080/`);
	console.log('');
	console.log('[HPM] Proxy created: / -> https://alpha.jitsi.net');
	console.log('═════════════════════════════════════════════\n');
}

logServerInfo();
