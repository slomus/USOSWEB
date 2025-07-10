#!/bin/bash

set -e

# Funkcja help
show_help() {
    echo "Uzywanie: $0 <serwis> <ilosc_podow>"
    echo ""
    echo "Dostepne serwisy:"
    echo "  api-gateway"
    echo "  calendar"
    echo "  messaging"
    echo "  common"
    echo "  frontend"
    echo ""
    echo "Przyklad:"
    echo "  $0 calendar 3      # Skaluje calendar do 3 podow"
    echo "  $0 api-gateway 2   # Skaluje api-gateway do 2 podow"
    echo ""
    echo "Sprawdz status:"
    echo "  kubectl get pods -n usosweb"
}

# Sprawdz argumenty
if [ $# -ne 2 ]; then
    show_help
    exit 1
fi

SERVICE=$1
REPLICAS=$2

# Sprawdz czy replicas to liczba
if ! [[ "$REPLICAS" =~ ^[0-9]+$ ]]; then
    echo "BLAD: Ilosc podow musi byc liczba"
    exit 1
fi

# Sprawdz czy kubectl dziala
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "BLAD: Kubernetes nie jest dostepny"
    exit 1
fi

# Lista dozwolonych serwisow
case $SERVICE in
    api-gateway|calendar|messaging|common|frontend)
        echo "Skalowanie serwisu $SERVICE do $REPLICAS podow..."
        kubectl scale deployment $SERVICE --replicas=$REPLICAS -n usosweb
        
        echo "Czekanie na gotowsc podow..."
        kubectl wait --for=condition=ready pod -l app=$SERVICE -n usosweb --timeout=300s
        
        echo "Status po skalowaniu:"
        kubectl get pods -l app=$SERVICE -n usosweb
        ;;
    *)
        echo "BLAD: Nieznany serwis '$SERVICE'"
        show_help
        exit 1
        ;;
esac

echo "Skalowanie zakonczone!" 