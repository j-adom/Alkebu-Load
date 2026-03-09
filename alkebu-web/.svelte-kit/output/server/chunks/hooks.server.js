const handle = async ({ event, resolve }) => {
  const token = event.cookies.get("payload-token");
  if (token) {
    try {
      const response = await fetch(`${process.env.PAYLOAD_API_URL}/api/users/me`, {
        headers: {
          "Authorization": `JWT ${token}`
        }
      });
      if (response.ok) {
        event.locals.user = await response.json();
      }
    } catch (error) {
      event.cookies.delete("payload-token", { path: "/" });
    }
  }
  return resolve(event);
};
export {
  handle
};
