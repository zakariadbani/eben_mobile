import { Role, useSession } from "@/context/AuthContext";
import { View } from "react-native";

interface WithRoleProps {
  children: React.ReactNode;
  role: Role;
}

const WithRole: React.FC<WithRoleProps> = ({ children, role }) => {
  const { session, isLoading } = useSession();
  // If still loading, don't render anything (or a loader if you prefer)
  if (isLoading) {
    return null; // You can replace this with a spinner or loader component if needed
  }
  const currentRole = session?.role || "guest";

  // If the role doesn't match, return null (or a placeholder component)
  if (currentRole !== role) {
    return null; // Or return something else like <></> if you prefer
  }

  // Otherwise, render the children
  return <View>{children}</View>;
};

export default WithRole;
