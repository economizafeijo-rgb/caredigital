DO $patch$
DECLARE
  v_definition text;
  v_signature regprocedure;
BEGIN
  v_signature:='public.care_update_intake_entry(uuid,text,uuid,text,integer,timestamptz)'::regprocedure;
  v_definition:=pg_get_functiondef(v_signature);
  v_definition:=replace(v_definition,'IF p_entry_id IS NULL OR p_entry_type NOT IN','IF p_entry_id IS NULL OR p_entry_type IS NULL OR p_entry_type NOT IN');
  IF position('p_entry_type IS NULL' in v_definition)=0 THEN RAISE EXCEPTION 'Could not patch update intake validation'; END IF;
  EXECUTE v_definition;

  v_signature:='public.care_delete_intake_entry(uuid,text,uuid)'::regprocedure;
  v_definition:=pg_get_functiondef(v_signature);
  v_definition:=replace(v_definition,'IF p_entry_id IS NULL OR p_entry_type NOT IN','IF p_entry_id IS NULL OR p_entry_type IS NULL OR p_entry_type NOT IN');
  IF position('p_entry_type IS NULL' in v_definition)=0 THEN RAISE EXCEPTION 'Could not patch delete intake validation'; END IF;
  EXECUTE v_definition;
END;
$patch$;
NOTIFY pgrst, 'reload schema';
