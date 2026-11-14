import { Redirect } from 'expo-router';
import { useStore } from '../store';
export default function Index() {
  const { state } = useStore();
  return <Redirect href={state.setupComplete ? '/home' : '/setup'} />;
}
