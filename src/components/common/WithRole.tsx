import { Role, useSession } from "@/context/AuthContext";
import { View } from "react-native";

interface WithRoleProps {
  children: React.ReactNode;
  role: Role;
}

const WithRole: React.FC<WithRoleProps> = ({ children, role }) => {
  const { role: currentRole, isLoading } = useSession();
  if (isLoading || currentRole !== role) return null;
  return <View>{children}</View>;
};

export default WithRole;
