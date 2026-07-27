import React, { useState } from "react";
import { FlatList, StyleSheet } from "react-native";
import View from "@/components/common/View";
import Screen from "@/components/common/Screen";
import EmptyListComponent from "@/components/screens/shared/app/EmptyListComponent";
import Button from "@/components/common/Button";
import { dataRequests } from "@/data/ws";
import ItemRequestComponent from "@/components/screens/shared/app/ItemRequestComponent";
import FilterButton from "@/components/common/FilterButton";
import { useRouter, Href } from "expo-router"; // Import the router

const OrdersListScreen = () => {
  const orders = dataRequests;
  const [sortAsc, setSortAsc] = useState(false);
  const [filters, setFilters] = useState<Record<string, boolean>>({});
  const filteredOrders = orders.filter((order) => {
    const statuses: string[] = [];
    if (filters.livre) statuses.push("delivered");
    if (filters.en_route) statuses.push("received");
    if (filters.paiement) statuses.push("new");
    return statuses.length === 0 || statuses.includes(order.status);
  });
  const sortedOrders = [...filteredOrders].sort((a, b) => sortAsc ? a.id - b.id : b.id - a.id);
  const router = useRouter(); // Get the router instance

  const filterFields: {
    id: string;
    label: string;
    type: "number" | "text" | "date" | "boolean";
  }[] = [
    { id: "livre", label: "Livré", type: "boolean" }, //automatique
    { id: "paiement", label: "Paiement", type: "boolean" }, //automatique
    { id: "en_route", label: "En route", type: "boolean" }, //automatique
  ];
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View flexDirection="row" gap={10}>
            <Button
              rightIcon="arrow_up"
              iconType="custom"
              fit
              iconTypeName="AntDesign"
              outline
              bordless
              onPress={() => setSortAsc(true)}
            />
            <Button
              rightIcon="arrow_down"
              iconType="custom"
              fit
              iconTypeName="AntDesign"
              outline
              bordless
              onPress={() => setSortAsc(false)}
            />
          </View>

          <FilterButton
            style={{ paddingVertical: 11, marginBottom: 4 }}
            fields={filterFields}
            onApplyFilters={(nextFilters) => setFilters(nextFilters as Record<string, boolean>)}
          />
        </View>
        <FlatList
          data={sortedOrders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ItemRequestComponent
              key={item.id}
              item={item}
              onPress={() => {
                router.push(("/(client)/requests/" + item.id) as Href);
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyListComponent title="Vous n'avez pas de commandes" />
          }
        />
      </View>
    </Screen>
  );
};

export default OrdersListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // padding: 10,
    // borderBottomWidth: 0.5,
    // borderColor: Colors.grayDark,
    marginTop: 10,
    marginBottom: 15,
  },
});
