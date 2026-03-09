function hasStatus(error) {
  return typeof error === "object" && error !== null && "status" in error && typeof error.status === "number";
}
function is404Error(error) {
  return hasStatus(error) && error.status === 404;
}
export {
  is404Error as i
};
