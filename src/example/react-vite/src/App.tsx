import { useEffect, useState } from 'react';

function App() {
  useEffect(() => {
    const interval = setInterval(() => {}, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div>Hello</div>;
}

function Test() {
  const [mounted, setMounted] = useState(true);

  return (
    <>
      <button onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount App' : 'Mount App'}
      </button>

      {mounted && <App />}
    </>
  );
}

export default Test;
