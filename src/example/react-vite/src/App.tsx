import { useEffect } from 'react';

function App() {
  useEffect(() => {
    setInterval(() => {
      console.log('tick');
    }, 1000);
  }, []);

  return <div>Hello</div>;
}

export default App;
