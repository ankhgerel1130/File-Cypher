async function textTo256BitKey(text) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(text));
    return crypto.subtle.importKey(
        'raw',
        hashBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptAndDownload() {
    const imageInput = document.getElementById('imageInput1');
    const encryptionKeyInput = document.getElementById('encryptionKey');

    if (!imageInput || !imageInput.files || imageInput.files.length === 0 || !encryptionKeyInput.value) {
        alert('Please select an image and enter an encryption key.');
        return;
    }

    try {
        const imageArrayBuffer = await imageInput.files[0].arrayBuffer();
        const encryptionKey = await textTo256BitKey(encryptionKeyInput.value);
        const encryptionIv = crypto.getRandomValues(new Uint8Array(12));

        // Store IV in localStorage
        localStorage.setItem('encryptionIv', JSON.stringify(Array.from(encryptionIv)));

        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: encryptionIv },
            encryptionKey,
            imageArrayBuffer
        );

        const encryptedBlob = new Blob([encryptedBuffer], { type: 'image/jpeg' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(encryptedBlob);
        downloadLink.download = 'encrypted_image.jpg';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error('Encryption failed:', error);
        alert('Encryption failed. Please check the console for more details.');
    }
}

async function decryptAndDisplay() {
    const imageInput = document.getElementById('imageInput2');
    const decryptionKeyInput = document.getElementById('decryptionKey');

    if (!imageInput || !imageInput.files || imageInput.files.length === 0 || !decryptionKeyInput.value) {
        alert('Please select an image and enter a decryption key.');
        return;
    }

    try {
        const encryptedImageArrayBuffer = await imageInput.files[0].arrayBuffer();
        const decryptionKey = await textTo256BitKey(decryptionKeyInput.value);

        // Retrieve IV from localStorage
        const storedEncryptionIv = localStorage.getItem('encryptionIv');
        const encryptionIv = storedEncryptionIv ? new Uint8Array(JSON.parse(storedEncryptionIv)) : null;

        if (!encryptionIv || encryptionIv.length !== 12) {
            console.error('Invalid IV or IV length.');
            alert('Invalid IV or IV length. Unable to decrypt.');
            return;
        }

        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: encryptionIv },
            decryptionKey,
            encryptedImageArrayBuffer
        );

        const decryptedBlob = new Blob([decryptedBuffer], { type: 'image/jpeg' });

        const decryptedImage = new Image();
        decryptedImage.src = URL.createObjectURL(decryptedBlob);

        document.body.appendChild(decryptedImage);
    } catch (error) {
        console.error('Decryption failed:', error);
        alert('Decryption failed. Please check the console for more details.');
    }
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        // Toggle the visibility of the selected section
        section.style.display = section.style.display === 'block' ? 'none' : 'block';
    }
}
