const payloadEl = document.getElementById('payload');
try {
  const data = location.hash.slice(1);
  if (data) {
    const decoded = decodeURIComponent(data);
    const parsed = JSON.parse(decoded);
    payloadEl.textContent = JSON.stringify(parsed, null, 2);
  } else {
    payloadEl.textContent = '(no data)';
  }
} catch (err) {
  payloadEl.textContent = `Failed to parse: ${err.message}`;
}
