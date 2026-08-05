import "./Greeting.css";

function Greeting() {
  const hour = new Date().getHours();

  let greeting = "Good Evening";

  if (hour < 12) {
    greeting = "Good Morning";
  } else if (hour < 18) {
    greeting = "Good Afternoon";
  }

  return (
    <section className="greeting">
      <h1>{greeting}</h1>
    </section>
  );
}

export default Greeting;