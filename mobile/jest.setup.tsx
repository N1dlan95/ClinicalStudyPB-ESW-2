// Ícones carregam fontes nativas, que não existem no ambiente de teste.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = jest.requireActual('react-native');
  const Icone = ({ name }: { name: string }) => <Text>{`icone:${name}`}</Text>;
  return { __esModule: true, default: Icone };
});
