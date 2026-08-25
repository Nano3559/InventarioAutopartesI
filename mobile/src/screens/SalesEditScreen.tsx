import { useRoute, RouteProp } from '@react-navigation/native';
import SalesScreen from './SalesScreen';
import type { RootStackParamList } from '../types/navigation';

type SalesEditScreenRouteProp = RouteProp<RootStackParamList, 'SalesEdit'>;

export default function SalesEditScreen() {
  const route = useRoute<SalesEditScreenRouteProp>();
  const { saleId } = route.params;

  return <SalesScreen initialSaleId={saleId} />;
}