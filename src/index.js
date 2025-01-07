#!/usr/bin/env node

const { exec } = require('child_process');
const { program } = require('commander');
const Table = require('cli-table3'); // Required to display tables in the console

// Function to scan nearby Bluetooth devices
function scanDevices() {
    exec('bluetoothctl scan on', (error) => {
        if (error) {
            console.error(`Error starting scan: no bluetooth adapter found`);
            return;
        }

        console.log("Scanning in progress. Wait for devices to appear...");
        setTimeout(() => {
            exec('bluetoothctl devices', (err, devicesOutput) => {
                if (err) {
                    console.error(`Error listing devices: ${err.message}`);
                    return;
                }

                const devices = [];
                console.log("Discovered Devices:");
                const deviceList = devicesOutput.split('\n');
                deviceList.forEach((deviceLine) => {
                    const deviceMac = deviceLine.split(' ')[1]; // Assuming the MAC address is the second word
                    const deviceName = deviceLine.split(' ').slice(2).join(' '); // Get the name from the rest of the line
                    if (deviceMac) {
                        devices.push({ deviceMac, deviceName, connectedTo: 'N/A' }); // Default "not connected"
                    }
                });

                // After scanning, list paired devices
                exec('bluetoothctl paired-devices', (pairedErr, pairedDevicesOutput) => {
                    if (pairedErr) {
                        console.error(`Error listing paired devices: ${pairedErr.message}`);
                        return;
                    }

                    console.log("Paired Devices:");
                    const pairedDevices = pairedDevicesOutput.split('\n');
                    pairedDevices.forEach((pairedLine) => {
                        const deviceMac = pairedLine.split(' ')[1]; // MAC address
                        const deviceName = pairedLine.split(' ').slice(2).join(' '); // Device name
                        if (deviceMac) {
                            // Check the connection status for each device
                            exec(`bluetoothctl info ${deviceMac}`, (infoErr, infoOutput) => {
                                if (infoErr) {
                                    console.error(`Error getting device info: ${infoErr.message}`);
                                    return;
                                }

                                // Check if connected
                                const isConnected = infoOutput.includes('Connected: yes');
                                const connectedDeviceMatch = isConnected ? infoOutput.match(/UUID.*?([0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5})/) : null;

                                if (isConnected && connectedDeviceMatch) {
                                    const connectedDeviceMac = connectedDeviceMatch[1];
                                    devices.forEach((device) => {
                                        if (device.deviceMac === deviceMac) {
                                            device.connectedTo = connectedDeviceMac; // Update the connection info
                                        }
                                    });
                                }
                            });
                        }
                    });

                    // Wait until all async exec calls are finished and then display the table
                    setTimeout(() => {
                        const table = new Table({
                            head: ['Device MAC', 'Device Name', 'Connected To'],
                            colWidths: [20, 30, 20]
                        });

                        devices.forEach((device) => {
                            table.push([device.deviceMac, device.deviceName, device.connectedTo]);
                        });

                        console.log(table.toString());
                    }, 2000); // Give time for all `exec` calls to finish
                });

                // Stop scanning after 10 seconds
                exec('bluetoothctl scan off', (stopError) => {
                    if (stopError) console.error(`Error stopping scan: ${stopError.message}`);
                });
            });
        }, 10000); // Scan for 10 seconds
    });
}

// Function to disconnect a Bluetooth device by MAC address
function disconnectDevice(twsMac) {
    console.log(`Attempting to disconnect device with MAC: ${twsMac}...`);
    exec(`bluetoothctl disconnect ${twsMac}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error disconnecting device: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(stdout);
        console.log(`Device ${twsMac} has been disconnected.`);
    });
}

// Function to connect a Bluetooth device to the Linux machine
function connectToLinux(twsMac) {
    console.log(`Attempting to connect device with MAC: ${twsMac} to Linux machine...`);
    exec(`bluetoothctl pair ${twsMac}`, (pairError, pairOutput, pairStderr) => {
        if (pairError) {
            console.error(`Error pairing device: ${pairError.message}`);
            return;
        }
        if (pairStderr) {
            console.error(`Stderr: ${pairStderr}`);
            return;
        }
        console.log(pairOutput);

        exec(`bluetoothctl trust ${twsMac}`, (trustError, trustOutput, trustStderr) => {
            if (trustError) {
                console.error(`Error trusting device: ${trustError.message}`);
                return;
            }
            if (trustStderr) {
                console.error(`Stderr: ${trustStderr}`);
                return;
            }
            console.log(trustOutput);

            exec(`bluetoothctl connect ${twsMac}`, (connectError, connectOutput, connectStderr) => {
                if (connectError) {
                    console.error(`Error connecting to device: ${connectError.message}`);
                    return;
                }
                if (connectStderr) {
                    console.error(`Stderr: ${connectStderr}`);
                    return;
                }
                console.log(connectOutput);
                console.log(`Device ${twsMac} connected to Linux machine.`);
            });
        });
    });
}

// CLI configuration
program
    .name('bluemooth')
    .description('A CLI tool for managing Bluetooth devices')
    .version('1.0.1')
    .option('-s, --scan', 'Scan for nearby Bluetooth devices')
    .option(
        '-d, --disconnect <twsMac>',
        'Disconnect a TWS device by providing the TWS MAC address'
    )
    .option(
        '-c, --connect <twsMac>',
        'Connect a TWS device to the Linux machine by providing the TWS MAC address'
    );

program.parse(process.argv);
const options = program.opts();

// Execute based on CLI options
if (options.scan) {
    scanDevices();
} else if (options.disconnect) {
    const { disconnect } = options;
    if (!disconnect) {
        console.error('TWS MAC address must be provided for disconnect.');
    } else {
        console.log(`Disconnecting ${disconnect}...`);
        disconnectDevice(disconnect);  // Disconnecting the TWS device by its MAC address
    }
} else if (options.connect) {
    const { connect } = options;
    if (!connect) {
        console.error('TWS MAC address must be provided for connection.');
    } else {
        console.log(`Connecting ${connect} to Linux...`);
        connectToLinux(connect);  // Connecting the TWS device to the Linux machine
    }
} else {
    console.log(
        'Use --scan to scan devices, --disconnect <twsMac> to disconnect, or --connect <twsMac> to connect.'
    );
}
