set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
RELEASE_FILE="$DIR/dist/release.zip"

echo -n "Preparing dist... "
rm -rf $DIR/dist 2> /dev/null || true
echo "OK"

echo "Creating ZIP release... "
mkdir -p $DIR/dist
find $DIR -type f -depth 1 -not -name '.*' -not -name '*.sh' | zip -j $RELEASE_FILE -@
echo
echo "Release prepared to $RELEASE_FILE"
