function formatDate(date, options) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const defaultOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options
  };
  return dateObj.toLocaleDateString("en-US", defaultOptions);
}
function formatDateShort(date) {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
export {
  formatDate as a,
  formatDateShort as f
};
