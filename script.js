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


//File 
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        // Toggle the visibility of the selected section
        section.style.display = section.style.display === 'block' ? 'none' : 'block';
    }
}
async function encryptFolderOrZip() {
    const input = document.getElementById('folderZipInput');
    const encryptionKeyInput = document.getElementById('folderEncryptionKey');

    if (!input.files.length || !encryptionKeyInput.value) {
        alert('Please select files or folders and enter an encryption key.');
        return;
    }

    const encryptionKey = await textTo256BitKey(encryptionKeyInput.value);
    const encryptionIv = crypto.getRandomValues(new Uint8Array(12));
    localStorage.setItem('folderEncryptionIv', JSON.stringify(Array.from(encryptionIv)));

    const zip = new JSZip();

    for (const file of input.files) {
        const filePath = file.webkitRelativePath || file.name;
        zip.file(filePath, file);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipArrayBuffer = await zipBlob.arrayBuffer();

    // Encrypt ZIP content
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: encryptionIv },
        encryptionKey,
        zipArrayBuffer
    );

    const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(encryptedBlob);
    downloadLink.download = 'encrypted_files.zip';

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
async function decryptFolderOrZip() {
    const input = document.getElementById('folderZipInputDecrypt');
    const decryptionKeyInput = document.getElementById('folderDecryptionKey');

    if (!input.files.length || !decryptionKeyInput.value) {
        alert('Please select a ZIP file and enter a decryption key.');
        return;
    }

    const decryptionKey = await textTo256BitKey(decryptionKeyInput.value);
    const storedIv = localStorage.getItem('folderEncryptionIv');
    const encryptionIv = storedIv ? new Uint8Array(JSON.parse(storedIv)) : null;

    if (!encryptionIv) {
        alert('Missing IV for decryption.');
        return;
    }

    const file = input.files[0];
    const encryptedBuffer = await file.arrayBuffer();

    try {
        // Decrypt the ZIP file
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: encryptionIv },
            decryptionKey,
            encryptedBuffer
        );

        // Load decrypted ZIP content using JSZip
        const zip = await JSZip.loadAsync(decryptedBuffer);

        // Collect all file promises
        const newZip = new JSZip();
        const filePromises = [];

        zip.forEach((relativePath, file) => {
            const filePromise = file.async('blob').then((content) => {
                newZip.file(relativePath, content);
            });
            filePromises.push(filePromise);
        });

        // Wait for all file promises to resolve
        await Promise.all(filePromises);

        // Generate the new ZIP file
        const newZipBlob = await newZip.generateAsync({ type: 'blob' });

        // Create a download link for the new ZIP file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(newZipBlob);
        downloadLink.download = 'decrypted_files.zip';
        downloadLink.textContent = 'Download Decrypted Folder';

        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

    } catch (error) {
        console.error('Decryption failed:', error);
        alert('Decryption failed. Invalid key or file.');
    }
}
