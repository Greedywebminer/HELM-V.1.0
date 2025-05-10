#!/data/data/com.termux/files/usr/bin/bash

# Update and upgrade Termux packages
echo "[*] Updating packages..."
yes | pkg update && yes | pkg upgrade

# Install required packages
echo "[*] Installing OpenSSH and dependencies..."
yes | pkg install openssh libjansson wget nano -y

# Create the .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Generate SSH keys if they don't exist
if [ ! -f ~/.ssh/id_rsa ]; then
  echo "[*] Generating SSH keys..."
  ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
fi

# Add the public key to authorized_keys
echo "[*] Adding public key to authorized_keys..."
cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Start the SSH service
echo "[*] Starting SSH service..."
sshd
