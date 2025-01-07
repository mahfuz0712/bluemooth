#!/bin/bash

# Update package list
echo "Updating package list..."
sudo apt update -y

# Install Bluetooth utilities (BlueZ)
echo "Installing Bluetooth utilities (bluez)..."
sudo apt install -y bluez pulseaudio-module-bluetooth pavucontrol

# Start and enable the Bluetooth service
echo "Starting and enabling Bluetooth service..."
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Optional: Install rfkill (to manage wireless devices)
echo "Installing rfkill for wireless management..."
sudo apt install -y rfkill

# Optional: Install dbus (for Bluetooth service communication)
echo "Installing dbus for Bluetooth service communication..."
sudo apt install -y dbus

# Check if bluemooth already exists in /usr/local/bin
if [ -f /usr/local/bin/bluemooth ]; then
    echo "bluemooth already exists in /usr/local/bin. Removing the old version..."
    sudo rm /usr/local/bin/bluemooth
else
    echo "bluemooth does not exist in /usr/local/bin. Proceeding to install..."
fi

# Move bluemooth to /usr/local/bin
echo "Installing bluemooth..."
sudo cp bluemooth /usr/local/bin/

# Make it executable
sudo chmod +x /usr/local/bin/bluemooth

# Notify the user that the setup is complete
echo "Installation completed successfully!"
