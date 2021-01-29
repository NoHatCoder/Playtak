shopt -s globstar
for f in /static/*  /static/**/* ; do
  if [[ ! ( "$f" =~ \.gz$ ) ]] ; then
    if [[ ! ( -d "$f" ) ]] ; then
      sudo gzip -k -N -f -9 "$f"
      osize=$(stat -c %s "$f")
      nsize=$(stat -c %s "$f.gz")
      echo $f $osize $nsize $(( $osize * 9 ))
      if [[ $(( $osize * 9 )) -lt $(( $nsize * 10 )) ]] ; then
        sudo rm "$f.gz"
      fi
    fi
  fi
done
