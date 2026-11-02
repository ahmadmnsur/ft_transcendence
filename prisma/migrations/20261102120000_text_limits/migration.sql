ALTER TABLE "Student" ADD CONSTRAINT student_text_length CHECK (char_length(email) BETWEEN 1 AND 254 AND char_length(display_name) BETWEEN 1 AND 40 AND (learning_goal_text IS NULL OR char_length(learning_goal_text) BETWEEN 1 AND 200));

ALTER TABLE "Review" ADD CONSTRAINT review_text_length CHECK (char_length(learned) BETWEEN 1 AND 2000 AND char_length(can_now_do) BETWEEN 1 AND 2000);

ALTER TABLE "PrivateFeedback" ADD CONSTRAINT private_feedback_text_length CHECK (char_length(answer_usefulness) BETWEEN 1 AND 2000 AND char_length(answer_explanation) BETWEEN 1 AND 2000);

ALTER TABLE "Post" ADD CONSTRAINT post_body_length CHECK ((review_id IS NULL OR char_length(body) BETWEEN 1 AND 280) AND (prompt_id IS NULL OR char_length(body) BETWEEN 1 AND 1000));

ALTER TABLE "ReflectionPrompt" ADD CONSTRAINT reflection_prompt_question_length CHECK (char_length(question) BETWEEN 1 AND 300);

ALTER TABLE "Report" ADD CONSTRAINT report_text_length CHECK (text IS NULL OR char_length(text) BETWEEN 1 AND 1000);

ALTER TABLE "Evidence" ADD CONSTRAINT evidence_filename_length CHECK (char_length(filename) BETWEEN 1 AND 255);

CREATE FUNCTION direct_message_body_length() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.body IS NOT DISTINCT FROM OLD.body THEN
    RETURN NEW;
  END IF;
  IF char_length(NEW.body) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'new row for relation "DirectMessage" violates direct_message_body_length'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'direct_message_body_length';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER direct_message_body_length
BEFORE INSERT OR UPDATE OF body ON "DirectMessage"
FOR EACH ROW EXECUTE FUNCTION direct_message_body_length();
