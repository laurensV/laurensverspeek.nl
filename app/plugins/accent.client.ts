// Apply the visitor's saved accent color as early as possible on the client.
export default defineNuxtPlugin(() => {
  useAccent().initAccent()
})
