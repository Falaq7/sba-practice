// Match the device before first paint; saved preferences apply when storage opens.
document.body.dataset.mode=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
document.body.dataset.colourway='digital-dream';

document.body.style.setProperty('--prism-h','235');document.body.style.setProperty('--prism-h2','310');
